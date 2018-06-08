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

import LocalAccount from '../local_account';
import Person from '../person';
import RemoteAccount from '../remote_account';
import URI from '../uri';
import repository from '../test_repository';

describe('selectPersonById', () => {
  test('selects person by id', async () => {
    const inserted = new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'username',
      host: null
    });

    await repository.insertLocalAccount(inserted.account);

    const selected = await repository.selectPersonById(inserted.id);

    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', null);
  });

  test('selects person of local account by username and host', async () => {
    const inserted = new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'username',
      host: null
    });

    await repository.insertLocalAccount(inserted.account);

    const selected = await repository.selectPersonByUsernameAndNormalizedHost(
      'username', null);

    expect(selected).toHaveProperty('id', inserted.id);
    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', null);
  });

  test('selects person of remote account by username and host', async () => {
    const inserted = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inbox: {
          uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/inbox' })
        },
        publicKey: {
          uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/publickey' }),
          publicKeyPem: ''
        },
        uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/' })
      }),
      username: 'username',
      host: 'FiNgEr.ReMoTe.xn--kgbechtv'
    });

    await repository.insertRemoteAccount(inserted.account);

    const selected = await repository.selectPersonByUsernameAndNormalizedHost(
      'username', 'finger.remote.xn--kgbechtv');

    expect(selected).toHaveProperty('id', inserted.id);
    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', 'FiNgEr.ReMoTe.xn--kgbechtv');
  });

  test('resolves with null if not found', () =>
    expect(repository.selectPersonById(0)).resolves.toBe(null));
});
