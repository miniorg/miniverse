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

import { fabricateLocalAccount, fabricateNote } from './test/fabricator';

describe('getUri', () => {
  test('resolves with local URI', async () => {
    const { person } =
      await fabricateLocalAccount({ person: { username: 'attributed to' } });

    const { status } = await fabricateNote({ status: { person } });

    await expect(status.getUri()).resolves.toMatch(/^https:\/\/xn--kgbechtv\/@attributed%20to\//);
  });

  test('resolves with remote URI', async () => {
    const { status } = await fabricateNote(
      { status: { uri: { uri: 'https://NoTe.xn--kgbechtv/' } } });

    await expect(status.getUri()).resolves.toBe('https://NoTe.xn--kgbechtv/');
  });
});
