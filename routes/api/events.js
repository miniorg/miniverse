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

import OrderedCollection from '../../lib/ordered_collection';

export function get(request, response, next) {
  const { repository, user } = request;

  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Transfer-Encoding', 'chunked');

  repository.selectRecentNotesFromInbox(user).then(async notes => {
    const initialCollection = new OrderedCollection({
      orderedItems: notes.reverse()
    });

    const resolved = await initialCollection.toActivityStreams(repository);
    const subscribedChannel = repository.getInboxChannel(user);

    function listen(publishedChannel, message) {
      return response.write(`data:{"@context":"https://www.w3.org/ns/activitystreams","type":"OrderedCollection","orderedItems":[${message}]}\n\n`);
    }

    resolved['@context'] = 'https://www.w3.org/ns/activitystreams';
    response.write(`data:${JSON.stringify(resolved)}\n\n`);

    await repository.subscribe(subscribedChannel, listen);
    const heartbeat = setInterval(() => response.write(':\n'), 16384);

    request.on('close', () => {
      clearInterval(heartbeat);
      repository.unsubscribe(subscribedChannel, listen);
    });
  }, next);
};
