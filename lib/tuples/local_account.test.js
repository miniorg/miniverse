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

import { fabricateLocalAccount } from '../test/fabricator';
import repository from '../test/repository';
import LocalAccount from './local_account';

describe('toWebFinger', () =>
  test('returns WebFinger representation', async () => {
    const account = await fabricateLocalAccount({
      actor: {
        // See if it correctly encodes username.
        username: 'name of user'
      }
    });

    await expect(account.toWebFinger()).resolves.toEqual({
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

describe('create', () => {
  test('creates and returns an account', async () => {
    const username = 'name of user';
    const name = '';
    const summary = '';
    const admin = true;
    const salt = Buffer.from('salt');
    const serverKey = Buffer.from('serverKey');
    const storedKey = Buffer.from('storedKey');

    const account = await LocalAccount.create(
      repository,
      username,
      name,
      summary,
      admin,
      salt,
      serverKey,
      storedKey);

    expect(account).toHaveProperty('repository', repository);
    expect(account).toHaveProperty(['actor', 'repository'], repository);
    expect(account).toHaveProperty(['actor', 'username'], username);
    expect(account).toHaveProperty(['actor', 'host'], null);
    expect(account).toHaveProperty(['actor', 'name'], '');
    expect(account).toHaveProperty(['actor', 'summary'], '');
    expect(account).toHaveProperty('admin', admin);
    expect(account.privateKeyPem).toMatch(/^-----BEGIN RSA PRIVATE KEY-----\n(.|\n)*\n-----END RSA PRIVATE KEY-----\n$/);
    expect(account).toHaveProperty('salt', salt);
    expect(account).toHaveProperty('serverKey', serverKey);
    expect(account).toHaveProperty('storedKey', storedKey);
  });

  test('will rejects with an error if username is invalid', async () => {
    const username = '@';
    const name = '';
    const summary = '';
    const admin = true;
    const salt = Buffer.from('salt');
    const serverKey = Buffer.from('serverKey');
    const storedKey = Buffer.from('storedKey');

    await expect(LocalAccount.create(
      repository,
      username,
      name,
      summary,
      admin,
      salt,
      serverKey,
      storedKey)).rejects.toBeInstanceOf(Error);
  });
});
