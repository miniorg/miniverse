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
  type: ['application/activity+json', 'application/ld+json']
});

export function get({ params, repository }, response, next) {
  const [userpart, host] = params.acct.split('@', 2);
  const normalizedHost = URI.normalizeHost(host);

  repository.selectRecentNotesByUsernameAndNormalizedHost(userpart, normalizedHost)
            .then(async orderedItems => {
              const collection = new OrderedCollection({ orderedItems });
              const message = await collection.toActivityStreams(repository);

              message['@context'] = 'https://www.w3.org/ns/activitystreams';
              return message;
            }).then(response.json.bind(response), next);
}

export function post(request, response, next) {
  const { user, params, repository } = request;

  user.selectPerson(repository).then(person => {
    if (person.username != params.acct) {
      response.sendStatus(401);
    }

    middleware(request, response, error => {
      if (error) {
        next(error);
        return;
      }

      const object = new ParsedActivityStreams(request.body, { host: AnyHost });

      object.act(repository, person)
            .catch(error => {
              if (error instanceof TypeNotAllowed) {
                return object.create(repository, person).catch(error => {
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
