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

import { AbortController } from 'abort-controller';
import { Request, Response, json } from 'express';
import { promisify } from 'util';
import ParsedActivityStreams, {
  AnyHost,
  unexpectedType
} from '../../lib/parsed_activitystreams';
import { create } from '../../lib/tuples/create';
import OrderedCollection from '../../lib/tuples/ordered_collection';
import { normalizeHost } from '../../lib/tuples/uri';
import secure from '../_secure';
import sendActivityStreams from '../_send_activitystreams';

const abort = {};
const fallback = {};

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
})) as unknown as (request: Request, response: Response) => Promise<unknown>;

export const get = secure(async ({ params }, response) => {
  const [userpart, host] = params.acct.split('@', 2);
  const { repository } = response.app.locals;

  const actor = await repository.selectActorByUsernameAndNormalizedHost(
    userpart, host ? normalizeHost(host) : null);
  if (!actor) {
    response.sendStatus(403);
    return;
  }

  const statuses = await actor.select('statuses');

  const orderedItems =
    (await Promise.all(statuses.map(status => status.select('extension'))))
      .filter(Boolean as unknown as <T>(value: T | null) => value is T);

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
  const { headers: { origin }, params } = request;
  const { repository } = response.app.locals;

  if (typeof origin != 'string') {
    response.sendStatus(403);
    return;
  }

  if (origin.toLowerCase() != 'https://' + normalizeHost(repository.host)) {
    response.sendStatus(403);
    return;
  }

  if (!response.locals.user) {
    response.sendStatus(403);
    return;
  }

  const actor = await response.locals.user.select('actor');
  if (!actor) {
    response.sendStatus(403);
    return;
  }

  if (actor.username != params.acct) {
    response.sendStatus(403);
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
    const controller = new AbortController;

    request.on('aborted', () => controller.abort());

    try {
      result = await object.act(
        actor,
        controller.signal,
        error => error[unexpectedType] ? fallback : abort);
    } catch (error) {
      if (error != fallback) {
        throw error;
      }

      result = await create(
        repository,
        actor,
        object,
        controller.signal,
        () => abort);
      if (result) {
        result = await result.select('status');
        if (result) {
          result = await result.getUri(() => abort);
        }
      }
    }
  } catch (error) {
    if (error == abort) {
      response.sendStatus(422);
      return;
    }

    throw error;
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
