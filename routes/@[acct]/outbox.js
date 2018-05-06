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

import { parse } from 'cookie';
import { json } from 'express';
import ActivityStreams, {
  AnyHost,
  NoHost,
  TypeNotAllowed
} from '../../lib/activitystreams';
import Cookie from '../../lib/cookie';
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
              const { body } = await collection.toActivityStreams(repository);
              const message = await body;

              message['@context'] = 'https://www.w3.org/ns/activitystreams';
              return message;
            }).then(response.json.bind(response), next);
}

export function post(request, response, next) {
  const { headers, params, repository } = request;
  const { miniverse } = parse(headers.cookie);
  const digest = Cookie.digest(Cookie.parseToken(miniverse));

  repository.selectLocalAccountByDigestOfCookie(digest).then(async account => {
    const person = await account.selectPerson(repository);

    if (person.username != params.acct) {
      response.sendStatus(401);
    }

    middleware(request, response, error => {
      if (error) {
        next(error);
        return;
      }

      const collection = new ActivityStreams(request.body, { host: AnyHost });
      collection.getItems(repository).then(items =>
        Promise.all(items.map(item => {
          if (item.body == 'string') {
            return;
          }

          delete item.body.id;
          item.normalizedHost = NoHost;

          return item.act(repository, person).catch(error => {
            if (error instanceof TypeNotAllowed) {
              return item.create(repository, person).catch(error => {
                if (!(error instanceof TypeNotAllowed)) {
                  throw error;
                }
              });
            }

            throw error;
          });
        }))).then(() => response.sendStatus(201), next);
    });
  }).catch(next);
}
