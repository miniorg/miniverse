/*
  Copyright (C) 2018  Akihiko Odaki <nekomanma@pixiv.co.jp>

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

const middleware = json({
  type: ['application/activity+json', 'application/ld+json']
});

export function get({ params, repository }, response, next) {
  const [userpart, host] = params.acct.toLowerCase().split('@', 2);

  repository.selectRecentNotesByLowerUsernameAndHost(userpart, host).then(
    async orderedItems => {
      const collection = new OrderedCollection({ orderedItems });
      const { body } = await collection.toActivityStreams(repository);
      const message = await body;

      message['@context'] = 'https://www.w3.org/ns/activitystreams';
      return message;
      ;
    }).then(response.json.bind(response), next);
}

export function post(request, response, next) {
  const { miniverse } = parse(request.headers.cookie);
  const digest = Cookie.digest(Cookie.parseToken(miniverse));

  request.repository.selectPersonByDigestOfCookie(digest).then(person => {
    if (person.username.toLowerCase() != request.params.acct.toLowerCase()) {
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

          return item.act(request.repository, person).catch(error => {
            if (error instanceof TypeNotAllowed) {
              return item.create(request.repository, person).catch(error => {
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
