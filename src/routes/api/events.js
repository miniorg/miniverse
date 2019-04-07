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

import OrderedCollectionPage from '../../lib/tuples/ordered_collection_page';
import secure from '../_secure';

export const get = secure(async (request, response) => {
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Transfer-Encoding', 'chunked');

  const statuses = await request.user.select('inbox');

  const initialCollection = new OrderedCollectionPage({
    orderedItems: await Promise.all(
      statuses.reverse().map(status => status.select('extension')))
  });

  const resolved = await initialCollection.toActivityStreams();
  const subscribedChannel = request.repository.getInboxChannel(request.user);

  function listen(publishedChannel, message) {
    return response.write(`data:{"@context":"https://www.w3.org/ns/activitystreams","type":"OrderedCollectionPage","orderedItems":[${message}]}\n\n`);
  }

  resolved['@context'] = 'https://www.w3.org/ns/activitystreams';
  response.write(`data:${JSON.stringify(resolved)}\n\n`);

  await request.repository.subscribe(subscribedChannel, listen);
  const heartbeat = setInterval(() => response.write(':\n'), 16384);

  request.on('close', () => {
    clearInterval(heartbeat);
    request.repository.unsubscribe(subscribedChannel, listen);
  });
});
