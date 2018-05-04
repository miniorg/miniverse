/*
  Copyright (C) 2018  Akihiko Odaki <nekomanma@pixiv.co.jp>

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

import Person from './person';
import RemoteAccount from './remote_account';
import repository from './test_repository';

describe('constructor', () => {
  test('assigns itself to its person\'s account property if present', () => {
    const person = new Person;
    const account = new RemoteAccount({ person });

    expect(person.account).toBe(account);
  });

  test('works without person property', () => {
    new RemoteAccount;
  });
});

describe('selectPerson', () => test('loads and returns person', async () => {
  const account = new RemoteAccount({
    inbox: { uri: '' },
    person: new Person({
      host: 'remote.إختبار',
      username: 'ユーザー名'
    }),
    publicKey: {
      uri: '',
      publicKeyPem: ''
    },
    uri: ''
  });

  await repository.insertRemoteAccount(account);
  account.person = new Person({ account, id: account.person.id });

  await expect(account.selectPerson(repository))
    .resolves
    .toHaveProperty('username', 'ユーザー名');
}));
