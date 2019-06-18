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
import { fabricateLocalAccount, fabricateNote } from '../test/fabricator';
import { unwrap } from '../test/types';

describe('getUri', () => {
  const { signal } = new AbortController;

  test('resolves with local URI', async () => {
    const recover = jest.fn();

    const account =
      await fabricateLocalAccount({ actor: { username: 'attributed to' } });

    const actor = unwrap(await account.select('actor', signal, recover));
    const note = await fabricateNote({ status: { actor } });
    const status = unwrap(await note.select('status', signal, recover));

    await expect(status.getUri(signal, recover)).resolves.toMatch(/^https:\/\/xn--kgbechtv\/@attributed%20to\//);
    expect(recover).not.toHaveBeenCalled();
  });

  test('resolves with remote URI when it is resolved remote status', async () => {
    const recover = jest.fn();

    const note = await fabricateNote(
      { status: { uri: 'https://NoTe.xn--kgbechtv/' } });

    const status = unwrap(await note.select('status', signal, recover));

    await expect(status.getUri(signal, recover)).resolves.toBe('https://NoTe.xn--kgbechtv/');
    expect(recover).not.toHaveBeenCalled();
  });
});
