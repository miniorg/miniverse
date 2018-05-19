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
import ParsedActivityStreams, {
  AnyHost,
  TypeNotAllowed
} from '../../lib/parsed_activitystreams';
import OrderedCollection from '../../lib/ordered_collection';
import URI from '../../lib/uri';

const middleware = json({
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
});

export function get({ params, repository }, response, next) {
  const [userpart, host] = params.acct.split('@', 2);
  const normalizedHost = URI.normalizeHost(host);

  repository.selectRecentNotesByUsernameAndNormalizedHost(userpart, normalizedHost)
            .then(async orderedItems => {
              /*
                ActivityPub
                5.1 Outbox
                https://www.w3.org/TR/activitypub/#outbox
                > The outbox MUST be an OrderedCollection.
              */
              const collection = new OrderedCollection({ orderedItems });

              const message = await collection.toActivityStreams();

              message['@context'] = 'https://www.w3.org/ns/activitystreams';
              return message;
            }).then(response.json.bind(response), next);
}

/*
  ActivityPub
  5.1 Outbox
  https://www.w3.org/TR/activitypub/#outbox
  > The outbox accepts HTTP POST requests, with behaviour described in Client
  > to Server Interactions.
*/
export function post(request, response, next) {
  const { headers: { origin }, user, params, repository } = request;

  if (origin.toLowerCase() != 'https://' + URI.normalizeHost(repository.host)) {
    response.sendStatus(403);
    return;
  }

  if (!user) {
    response.sendStatus(401);
    return;
  }

  user.selectPerson().then(person => {
    if (person.username != params.acct) {
      response.sendStatus(401);
      return;
    }

    middleware(request, response, error => {
      if (error) {
        next(error);
        return;
      }

      const object =
        new ParsedActivityStreams(repository, request.body, { host: AnyHost });

      /*
        ActivityPub
        6. Client to Server Interactions
        https://www.w3.org/TR/activitypub/#client-to-server-interactions
        > The body of the POST request MUST contain a single Activity (which MAY
        > contain embedded objects), or a single non-Activity object which will
        > be wrapped in a Create activity by the server.
      */
      object.act(person)
            .catch(error => {
              if (error instanceof TypeNotAllowed) {
                return object.create(person).catch(error => {
                  if (!(error instanceof TypeNotAllowed)) {
                    throw error;
                  }
                });
              }

              throw error;
            })
            .then(result => result && result.getUri && result.getUri())
            .then(location => {
              /*
                ActivityPub
                6. Client to Server Interactions
                https://www.w3.org/TR/activitypub/#client-to-server-interactions
                > Servers MUST return a 201 Created HTTP code, and unless the
                > activity is transient, MUST include the new id in the Location
                > header.
              */
              if (location) {
                response.location(location);
              }

              response.sendStatus(201);
            }, next);
    });
  }).catch(next);
}
