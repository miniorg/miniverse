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
import { fabricateRemoteAccount } from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';

const { signal } = new AbortController;

describe('selectURIById', () => {
  test('resolves with null if not found', async () => {
    const recover = jest.fn();
    await expect(repository.selectURIById('0', signal, recover))
      .resolves.toBe(null);
    expect(recover).not.toHaveBeenCalled();
  });
});

describe('selectAllocatedURI', () => {
  test('resolves with null if not found', async () => {
    const recover = jest.fn();
    await expect(repository.selectAllocatedURI('', signal, recover))
      .resolves.toBe(null);
    expect(recover).not.toHaveBeenCalled();
  });
});

test('inserts remote account and allows to query the URI of its inbox by ID', async () => {
  const recover = jest.fn();

  const account = await fabricateRemoteAccount(
    { inbox: { uri: 'https://ReMoTe.إختبار/inbox' } });

  const { id } = unwrap(await account.select('inboxURI', signal, recover));

  await expect(repository.selectURIById(id, signal, recover))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/inbox');

  expect(recover).not.toHaveBeenCalled();
});

test('inserts remote account and allows to query the URI of its inbox', async () => {
  const recover = jest.fn();

  const account = await fabricateRemoteAccount(
    { inbox: { uri: 'https://ReMoTe.إختبار/inbox' } });

  const { id } = unwrap(await account.select('inboxURI', signal, recover));

  const uri = await repository.selectAllocatedURI(
    'https://ReMoTe.إختبار/inbox', signal, recover);

  expect(recover).not.toHaveBeenCalled();
  expect(uri).toHaveProperty('id', id);
  expect(uri).toHaveProperty('uri', 'https://ReMoTe.إختبار/inbox');
});
