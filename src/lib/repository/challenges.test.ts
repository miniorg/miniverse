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

import repository from '../test/repository';

test('inserts challenge and allows to query with digest', async () => {
  await repository.insertChallenge(Buffer.from('digest'));

  const digest = Buffer.from('digest');
  await expect(repository.selectChallengeByDigest(digest))
    .resolves
    .toHaveProperty('digest', digest);
});

test('does not return a challenge if not present', () =>
  expect(repository.selectChallengeByDigest(Buffer.from('digest')))
    .resolves
    .toBe(null));
