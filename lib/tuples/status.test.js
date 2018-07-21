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

import { fabricateLocalAccount, fabricateNote } from '../test/fabricator';
import { unwrap } from '../test/types';

describe('getUri', () => {
  test('resolves with local URI', async () => {
    const account =
      await fabricateLocalAccount({ actor: { username: 'attributed to' } });

    const actor = unwrap(await account.select('actor'));
    const note = await fabricateNote({ status: { actor } });
    const status = unwrap(await note.select('status'));

    await expect(status.getUri()).resolves.toMatch(/^https:\/\/xn--kgbechtv\/@attributed%20to\//);
  });

  test('resolves with remote URI when it is resolved remote status', async () => {
    const note = await fabricateNote(
      { status: { uri: { uri: 'https://NoTe.xn--kgbechtv/' } } });

    const status = unwrap(await note.select('status'));

    await expect(status.getUri()).resolves.toBe('https://NoTe.xn--kgbechtv/');
  });
});
