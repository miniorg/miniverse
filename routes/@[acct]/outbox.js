/*
  Copyright (C) 2018  Miniverse authors

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, version 3 of the License.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { json } from 'express';
import { promisify } from 'util';
import ParsedActivityStreams, {
  AnyHost,
  TypeNotAllowed
} from '../../lib/parsed_activitystreams';
import { create } from '../../lib/create';
import OrderedCollection from '../../lib/ordered_collection';
import { normalizeHost } from '../../lib/uri';
import secure from '../_secure';
import sendActivityStreams from '../_send_activitystreams';

const setBody = promisify(json({
  /*
    ActivityPub
    6. Client to Server Interactions
    https://www.w3.org/TR/activitypub/#client-to-server-interactions
    > Servers MAY interpret a Content-Type or Accept header of
    > application/activity+json as equivalent to
    > application/ld+json; profile="https://www.w3.org/ns/activitystreams"
    > for client-to-server interactions.
  */
  type: ['application/activity+json', 'application/ld+json']
}));

export const get = secure(async ({ params, repository }, response) => {
  const [userpart, host] = params.acct.split('@', 2);

  const actor = await repository.selectActorByUsernameAndNormalizedHost(
    userpart, host ? normalizeHost(host) : null);

  const statuses = await actor.select('statuses');

  const orderedItems =
    await Promise.all(statuses.map(status => status.select('extension')));

  /*
    ActivityPub
    5.1 Outbox
    https://www.w3.org/TR/activitypub/#outbox
    > The outbox MUST be an OrderedCollection.
  */
  const collection = new OrderedCollection({ orderedItems });

  await sendActivityStreams(response, collection);
});

/*
  ActivityPub
  5.1 Outbox
  https://www.w3.org/TR/activitypub/#outbox
  > The outbox accepts HTTP POST requests, with behaviour described in Client
  > to Server Interactions.
*/
export const post = secure(async (request, response) => {
  const { headers: { origin }, user, params, repository } = request;

  if (origin.toLowerCase() != 'https://' + normalizeHost(repository.host)) {
    response.sendStatus(403);
    return;
  }

  if (!user) {
    response.sendStatus(401);
    return;
  }

  const actor = await user.select('actor');
  if (actor.username != params.acct) {
    response.sendStatus(401);
    return;
  }

  await setBody(request, response);

  const object =
    new ParsedActivityStreams(repository, request.body, { host: AnyHost });

  let result;

  /*
    ActivityPub
    6. Client to Server Interactions
    https://www.w3.org/TR/activitypub/#client-to-server-interactions
    > The body of the POST request MUST contain a single Activity (which MAY
    > contain embedded objects), or a single non-Activity object which will
    > be wrapped in a Create activity by the server.
  */
  try {
    result = await object.act(actor);
  } catch (error) {
    if (!(error instanceof TypeNotAllowed)) {
      throw error;
    }

    result = await create(repository, actor, object);
    result = await result.getUri();
  }

  /*
    ActivityPub
    6. Client to Server Interactions
    https://www.w3.org/TR/activitypub/#client-to-server-interactions
    > Servers MUST return a 201 Created HTTP code, and unless the
    > activity is transient, MUST include the new id in the Location
    > header.
  */
  if (result) {
    response.location(result);
  }

 response.sendStatus(201);
});
