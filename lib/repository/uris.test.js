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

import { fabricateRemoteAccount } from '../test/fabricator';
import repository from '../test/repository';

describe('selectURI', () => test('resolves with null if not found', () =>
  expect(repository.selectURI('')).resolves.toBe(null)));

test('inserts remote account and allows to query the URI of its inbox by ID', async () => {
  const account = await fabricateRemoteAccount(
    { inboxURI: { uri: 'https://ReMoTe.إختبار/inbox' } });

  await expect(repository.selectURIById(account.inboxURI.id))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/inbox');
});

test('inserts remote account and allows to query the URI of its inbox', async () => {
  const account = await fabricateRemoteAccount(
    { inboxURI: { uri: 'https://ReMoTe.إختبار/inbox' } });

  const uri = await repository.selectURI('https://ReMoTe.إختبار/inbox');

  expect(uri).toHaveProperty('id', account.inboxURI.id);
  expect(uri).toHaveProperty('uri', 'https://ReMoTe.إختبار/inbox');
});
