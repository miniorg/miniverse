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

import LocalAccount from './local_account';
import Person from './person';
import repository from './test_repository';

describe('constructor', () => {
  test('assigns itself to its person\'s account property if present', () => {
    const person = new Person;
    const account = new LocalAccount({ person });

    expect(person.account).toBe(account);
  });

  test('works without person property', () => {
    new LocalAccount;
  });
});

describe('toWebFinger', () =>
  test('loads person and returns WebFinger representation', async () => {
    const account = new LocalAccount({
      admin: true,
      person: new Person({
        // See if it correctly encodes username.
        username: 'name of user',

        host: null
      }),
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    });

    await repository.insertLocalAccount(account);
    account.person = new Person({ account, id: account.person.id });

    await expect(account.toWebFinger(repository)).resolves.toEqual({
      links: [
        {
          href: 'https://xn--kgbechtv/@name%20of%20user',
          rel: 'self',
          type: 'application/activity+json'
        }
      ],
      subject: 'acct:name%20of%20user@finger.xn--kgbechtv'
    });
  }));

describe('selectPerson', () => test('loads and returns person', async () => {
  const account = new LocalAccount({
    admin: true,
    person: new Person({
      host: null,
      username: 'ユーザー名'
    }),
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: ''
  });

  await repository.insertLocalAccount(account);
  account.person = new Person({ account, id: account.person.id });

  await expect(account.selectPerson(repository))
    .resolves
    .toHaveProperty('username', 'ユーザー名');
}));

describe('create', () => {
  test('creates and returns an account', async () => {
    const username = 'name of user';
    const admin = true;
    const salt = Buffer.from('salt');
    const serverKey = Buffer.from('serverKey');
    const storedKey = Buffer.from('storedKey');

    const account = await LocalAccount.create(
      repository,
      username,
      admin,
      salt,
      serverKey,
      storedKey);

    expect(account).toHaveProperty(['person', 'username'], username);
    expect(account).toHaveProperty(['person', 'host'], null);
    expect(account).toHaveProperty('admin', admin);
    expect(account.privateKeyPem).toMatch(/^-----BEGIN RSA PRIVATE KEY-----\n(.|\n)*\n-----END RSA PRIVATE KEY-----\n$/);
    expect(account).toHaveProperty('salt', salt);
    expect(account).toHaveProperty('serverKey', serverKey);
    expect(account).toHaveProperty('storedKey', storedKey);
  });

  test('will rejects with an error if username is invalid', async () => {
    const username = '@';
    const admin = true;
    const salt = Buffer.from('salt');
    const serverKey = Buffer.from('serverKey');
    const storedKey = Buffer.from('storedKey');

    await expect(LocalAccount.create(
      repository,
      username,
      admin,
      salt,
      serverKey,
      storedKey)).rejects.toBeInstanceOf(Error);
  });
});
