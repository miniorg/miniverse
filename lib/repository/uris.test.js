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

import repository from '../test_repository';
import Person from '../person';
import RemoteAccount from '../remote_account';
import URI from '../uri';

describe('selectURI', () => test('resolves with null if not found', () =>
  expect(repository.selectURI('')).resolves.toBe(null)));

test('inserts remote account and allows to query the URI of its inbox by ID', async () => {
  const account = new RemoteAccount({
    person: new Person({
      username: '',
      host: 'FiNgEr.ReMoTe.إختبار'
    }),
    inboxURI: new URI({ repository, uri: 'https://ReMoTe.إختبار/inbox' }),
    publicKeyURI: new URI({ repository, uri: 'https://ReMoTe.إختبار/key' }),
    publicKeyPem: '',
    uri: new URI({ repository, uri: '' })
  });

  await repository.insertRemoteAccount(account);

  await expect(repository.selectURIById(account.inboxURI.id))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/inbox');
});

test('inserts remote account and allows to query the URI of its inbox', async () => {
  const account = new RemoteAccount({
    person: new Person({
      username: '',
      host: 'FiNgEr.ReMoTe.إختبار'
    }),
    inboxURI: new URI({ repository, uri: 'https://ReMoTe.إختبار/inbox' }),
    publicKeyURI: new URI({ repository, uri: 'https://ReMoTe.إختبار/key' }),
    publicKeyPem: '',
    uri: new URI({ repository, uri: '' })
  });

  await repository.insertRemoteAccount(account);

  const uri = await repository.selectURI('https://ReMoTe.إختبار/inbox');

  expect(uri).toHaveProperty('id', account.inboxURI.id);
  expect(uri).toHaveProperty('uri', 'https://ReMoTe.إختبار/inbox');
});
