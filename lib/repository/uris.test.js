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

import Person from '../person';
import RemoteAccount from '../remote_account';
import repository from '../test_repository';
import URI from '../uri';

test('inserts account and allows to query its URI', async () => {
  const account = new RemoteAccount({
    repository,
    person: new Person({
      repository,
      username: '',
      host: 'FiNgEr.ReMoTe.xn--kgbechtv'
    }),
    inbox: { uri: '' },
    publicKey: {
      uri: '',
      publicKeyPem: ''
    },
    uri: 'https://ReMoTe.إختبار/'
  });

  await repository.insertRemoteAccount(account);
  const uri = await repository.selectURI('https://ReMoTe.إختبار/');

  expect(uri).toBeInstanceOf(URI);
  expect(uri).toHaveProperty('repository', repository);
  expect(uri).toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});
