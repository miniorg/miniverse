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
import { fabricateLocalAccount } from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Mention from './mention';

describe('toActivityStreams', () => {
  test('resolves with ActivityStreams representation', async () => {
    const recover = jest.fn();
    const { signal } = new AbortController;

    const account =
      await fabricateLocalAccount({ actor: { username: '行動者' } });

    const mention = new Mention({
      repository,
      href: unwrap(await account.select('actor', signal, recover))
    });

    await expect(mention.toActivityStreams(signal, recover)).resolves.toEqual({
      type: 'Mention',
      href: 'https://xn--kgbechtv/@%E8%A1%8C%E5%8B%95%E8%80%85'
    });

    expect(recover).not.toHaveBeenCalled();
  });
});
