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
import { Server } from 'ws';
import Cookie from '../../../lib/cookie';
import OrderedCollection from '../../../lib/ordered_collection';

export default (repository, httpServer) => {
  const webSocketServer = new Server({
    path: '/api/streaming',
    server: httpServer,
    verifyClient({ req }, done) {
      const secret = Cookie.parseToken(parse(req.headers.cookie).miniverse);

      repository.selectLocalAccountByDigestOfCookie(Cookie.digest(secret))
                .then(account => req.account = account)
                .then(() => done(req.account));
    },
  });

  webSocketServer.on('connection', (connection, { account }) => {
    repository.selectRecentNotesFromInbox(account).then(async notes => {
      const initialCollection = new OrderedCollection({
        orderedItems: notes.reverse()
      });

      const { body } = await initialCollection.toActivityStreams(repository);
      const resolved = await body;

      const subscribedChannel = repository.getInboxChannel(account);

      function listen(publishedChannel, message) {
        return connection.send(`{"@context":"https://www.w3.org/ns/activitystreams","type":"OrderedCollection","orderedItems":[${message}]}`);
      }

      resolved['@context'] = 'https://www.w3.org/ns/activitystreams';
      connection.send(JSON.stringify(resolved));

      await repository.subscribe(subscribedChannel, listen);

      connection.on(
        'close',
        () => repository.unsubscribe(subscribedChannel, listen));
    });
  });
};
