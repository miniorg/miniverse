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

async function testInsertAndQuery(query) {
  const inserted = new RemoteAccount({
    repository,
    person: new Person({
      repository,
      username: 'username',
      host: 'FiNgEr.ReMoTe.xn--kgbechtv'
    }),
    inbox: { uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/inbox' }) },
    publicKey: {
      uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/publickey' }),
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
    uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/' })
  });

  await repository.insertRemoteAccount(inserted);

  const queried = await query(inserted);

  expect(queried).toHaveProperty('inboxURIId', inserted.inboxURIId);
  expect(queried).toHaveProperty('publicKeyURIId', inserted.publicKeyURIId);
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

  return queried;
}

test('inserts account and allows to query one by username and normalized host', async() => {
  const queried = await testInsertAndQuery(() =>
    repository.selectRemoteAccountByUsernameAndNormalizedHost(
      'username', 'finger.remote.xn--kgbechtv'));

  expect(queried).toHaveProperty(['person', 'username'], 'username');
  expect(queried).toHaveProperty(['person', 'host'], 'FiNgEr.ReMoTe.xn--kgbechtv');
});

test('inserts account and allows to query one by key URI', () =>
  testInsertAndQuery(({ publicKey }) =>
    repository.selectRemoteAccountByKeyUri(publicKey.uri)));

test('inserts account and allows to query one by its id', () =>
  testInsertAndQuery(({ id }) =>
    repository.selectRemoteAccountById(id)));

describe('selectRemoteAccountById', () =>
  test('returns null if remote account is not associated', () =>
    expect(repository.selectRemoteAccountById(0)).resolves.toBe(null)));

describe('selectRemoteAccountByUsernameAndNormalizedHost', () =>
  test('returns null if not found', () =>
    expect(repository.selectRemoteAccountByUsernameAndNormalizedHost('', ''))
      .resolves
      .toBe(null)));

describe('selectRemoteAccountByKeyUri', () =>
  test('returns null if not found', () => {
    const uri = new URI({ repository, id: 0, uri: '' });
    expect(repository.selectRemoteAccountByKeyUri(uri)).resolves.toBe(null);
  }));
