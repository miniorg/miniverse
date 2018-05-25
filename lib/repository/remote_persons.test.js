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

import RemotePerson from '../remote_person';
import repository from '../test_repository';

async function testInsertAndQuery(query) {
  const inserted = new RemotePerson(repository, null, {
    username: 'username',
    host: 'FiNgEr.ReMoTe.xn--kgbechtv',
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

  await repository.insertRemotePerson(inserted);

  const queried = await query(inserted);
  const queriedProperties = await queried.get();

  expect(queried).toHaveProperty('id', inserted.id);
  expect(queriedProperties).toHaveProperty(['inbox', 'uri'], 'https://ReMoTe.إختبار/inbox');
  expect(queriedProperties).toHaveProperty(['publicKey', 'uri'], 'https://ReMoTe.إختبار/publickey');
  expect(queriedProperties).toHaveProperty(['publicKey', 'publicKeyPem'], `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`);
  expect(queried).toHaveProperty('repository', repository);
  expect(queriedProperties).toHaveProperty('uri', 'https://ReMoTe.إختبار/');

  return queried;
}

test('inserts person and allows to query its properties', async () =>
  testInsertAndQuery(async person => {
    const properties = await repository.loadRemotePerson(person);
    return new RemotePerson(repository, person.id, properties);
  }));

test('inserts person and allows to query one by username and normalized host', async () => {
  const queried = await testInsertAndQuery(() =>
    repository.selectRemotePersonByUsernameAndNormalizedHost(
      'username', 'finger.remote.xn--kgbechtv'));
  const queriedProperties = await queried.get();

  expect(queriedProperties).toHaveProperty('username', 'username');
  expect(queriedProperties).toHaveProperty('host', 'FiNgEr.ReMoTe.xn--kgbechtv');
});

test('inserts person and allows to query one by key URI', () =>
  testInsertAndQuery(() =>
    repository.selectRemotePersonByKeyUri('https://ReMoTe.إختبار/publickey')));

describe('selectRemotePersonByUsernameAndNormalizedHost', () =>
  test('returns null if not found', () =>
    expect(repository.selectRemotePersonByUsernameAndNormalizedHost('', ''))
      .resolves
      .toBe(null)));

describe('selectRemotePersonByKeyUri', () =>
  test('returns null if not found', () =>
    expect(repository.selectRemotePersonByKeyUri('')).resolves.toBe(null)));
