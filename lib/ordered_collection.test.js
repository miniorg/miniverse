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

import OrderedCollection from './ordered_collection';

describe('toActivityStreams', () =>
  test('returns ActivityStreams representation', async () => {
    const collection = new OrderedCollection({
      orderedItems: [
        {
          async toActivityStreams() {
            return 'https://إختبار';
          }
        }
      ]
    });

    const body = collection.toActivityStreams();

    await Promise.all([
      expect(body).resolves.toHaveProperty('type', 'OrderedCollection'),
      expect(body).resolves.toHaveProperty('orderedItems', ['https://إختبار'])
    ]);
  }));
