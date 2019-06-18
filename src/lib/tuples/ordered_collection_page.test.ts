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
import OrderedCollectionPage from './ordered_collection_page';

describe('toActivityStreams', () => {
  const { signal } = new AbortController;

  test('catches an error which is not AbortError', async () => {
    const collection = new OrderedCollectionPage({
      orderedItems: [
        {
          async toActivityStreams(_signal, recover) {
            throw recover(new Error);
          }
        }
      ]
    });

    const recover = jest.fn();

    await expect(collection.toActivityStreams(signal, recover)).resolves.toEqual({
      type: 'OrderedCollectionPage',
      orderedItems: []
    })

    expect(recover).not.toHaveBeenCalled();
  });

  test('propagates AbortError', async () => {
    const collection = new OrderedCollectionPage({
      orderedItems: [
        {
          async toActivityStreams(_signal, recover) {
            throw recover(Object.assign(new Error, { name: 'AbortError' }));
          }
        }
      ]
    });

    const recovery = {};

    await expect(collection.toActivityStreams(signal, () => recovery))
      .rejects.toBe(recovery);
  });

  test('returns ActivityStreams representation', async () => {
    const item = {
      type: 'Announce',
      id: 'https://Id.إختبار/',
      published: new Date,
      object: 'https://ObJeCt.إختبار/'
    };

    const collection = new OrderedCollectionPage({
      orderedItems: [
        {
          async toActivityStreams() {
            return item;
          }
        }
      ]
    });

    const recover = jest.fn();
    const body = collection.toActivityStreams(signal, recover);

    await Promise.all([
      expect(body).resolves.toHaveProperty('type', 'OrderedCollectionPage'),
      expect(body).resolves.toHaveProperty('orderedItems', [item])
    ]);
  });
});
