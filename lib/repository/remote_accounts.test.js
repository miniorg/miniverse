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
import repository from '../test_repository';

async function testInsertAndQuery(query) {
  const inserted = new RemoteAccount({
    repository,
    person: new Person({
      repository,
      username: 'username',
      host: 'FiNgEr.ReMoTe.xn--kgbechtv'
    }),
    inbox: { uri: 'https://ReMoTe.إختبار/inbox' },
    publicKey: {
      uri: 'https://ReMoTe.إختبار/publickey',
      publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`
    },
    uri: 'https://ReMoTe.إختبار/'
  });

  await repository.insertRemoteAccount(inserted);

  const queried = await query(inserted);

  expect(queried).toHaveProperty(['person', 'repository'], inserted.person.repository);
  expect(queried).toHaveProperty(['person', 'id'], inserted.person.id);
  expect(queried).toHaveProperty(['inbox', 'uri'], 'https://ReMoTe.إختبار/inbox');
  expect(queried).toHaveProperty(['publicKey', 'uri'], 'https://ReMoTe.إختبار/publickey');
  expect(queried).toHaveProperty(['publicKey', 'publicKeyPem'], `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`);
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('uri', 'https://ReMoTe.إختبار/');

  return queried;
}

test('inserts account and allows to load one by id', () =>
  testInsertAndQuery(async ({ person }) => {
    const loadedAccount = await repository.selectRemoteAccountByPerson(
      new Person({ repository, id: person.id }));

    const account = new RemoteAccount({ repository, id: loadedAccount.id });
    await repository.loadRemoteAccount(account);

    return account;
  }));

test('inserts account and allows to query one by username and normalized host', async() => {
  const queried = await testInsertAndQuery(() =>
    repository.selectRemoteAccountByUsernameAndNormalizedHost(
      'username', 'finger.remote.xn--kgbechtv'));

  expect(queried).toHaveProperty(['person', 'username'], 'username');
  expect(queried).toHaveProperty(['person', 'host'], 'FiNgEr.ReMoTe.xn--kgbechtv');
});

test('inserts account and allows to query one by key URI', () =>
  testInsertAndQuery(() =>
    repository.selectRemoteAccountByKeyUri('https://ReMoTe.إختبار/publickey')));

test('inserts account and allows to query one by its person', () =>
  testInsertAndQuery(({ person }) =>
    repository.selectRemoteAccountByPerson(
      new Person({ repository, id: person.id }))));

test('inserts account allows to query one by its person with loaded account', () =>
  testInsertAndQuery(({ person }) =>
    repository.selectRemoteAccountByPerson(person)));

test('inserts account allows to query one by its person with unloaded account', () =>
  testInsertAndQuery(({ person }) =>
    repository.selectRemoteAccountByPerson(new Person({
      repository,
      account: new RemoteAccount({ repository, }),
      id: person.id
    }))));

describe('selectRemoteAccountByUsernameAndNormalizedHost', () =>
  test('returns null if not found', () =>
    expect(repository.selectRemoteAccountByUsernameAndNormalizedHost('', ''))
      .resolves
      .toBe(null)));

describe('selectRemoteAccountByKeyUri', () =>
  test('returns null if not found', () =>
    expect(repository.selectRemoteAccountByKeyUri('')).resolves.toBe(null)));

describe('selectRemoteAccountByPerson', () => {
  test('returns null if local account is loaded', async () => {
    const account = new LocalAccount({
      repository,
      admin: true,
      person: new Person({ repository, username: '', host: null }),
      privateKeyPem: '',
      salt: Buffer.from([]),
      serverKey: Buffer.from([]),
      storedKey: Buffer.from([])
    });

    await repository.insertLocalAccount(account);

    await expect(repository.selectRemoteAccountByPerson(account.person))
      .resolves
      .toBe(null);
  });

  test('returns null if remote account is not associated', async () => {
    const account = new LocalAccount({
      repository,
      admin: true,
      person: new Person({ repository, username: '', host: null }),
      privateKeyPem: '',
      salt: Buffer.from([]),
      serverKey: Buffer.from([]),
      storedKey: Buffer.from([])
    });

    await repository.insertLocalAccount(account);
    delete account.person.account;

    await expect(repository.selectRemoteAccountByPerson(account.person))
      .resolves
      .toBe(null);
  });
});
