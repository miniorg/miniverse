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

import RemotePerson from './remote_person';
import repository from './test_repository';

describe('getUri', () => test('resovles with URI', () => {
  const person = new RemotePerson(
    repository, null, { uri: 'https://remote.xn--kgbechtv/' });

  return expect(person.getUri()).resolves.toBe('https://remote.xn--kgbechtv/');
}));

describe('create', () => {
  test('creates and resolves with an person', async () => {
    const person = await RemotePerson.create(
      repository,
      'name of user',
      'finger.remote.xn--kgbechtv',
      'https://remote.xn--kgbechtv/@name%20of%20user',
      { uri: 'https://remote.xn--kgbechtv/@name%20of%20user/inbox' },
      {
        uri: 'https://remote.xn--kgbechtv/@name%20of%20user#key',
        publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`
      });

    expect(person).toBeInstanceOf(RemotePerson);
    expect(person).toHaveProperty('repository', repository);

    const properties = await person.get();

    expect(properties).toHaveProperty('username', 'name of user');
    expect(properties).toHaveProperty('host', 'finger.remote.xn--kgbechtv');
    expect(properties).toHaveProperty('uri', 'https://remote.xn--kgbechtv/@name%20of%20user');
    expect(properties).toHaveProperty(['publicKey', 'publicKeyPem'], `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`);

    await Promise.all([
      expect(properties.inbox.uri.get()).resolves.toEqual({
        uri: 'https://remote.xn--kgbechtv/@name%20of%20user/inbox'
      }),
      expect(properties.publicKey.uri.get()).resolves.toEqual({
        uri: 'https://remote.xn--kgbechtv/@name%20of%20user#key'
      })
    ]);

    const queried =
      await repository.selectRemotePersonByUsernameAndNormalizedHost(
        'name of user',  'finger.remote.xn--kgbechtv');

    const queriedProperties = await queried.get();

    expect(queriedProperties).toHaveProperty('username', 'name of user');
    expect(queriedProperties).toHaveProperty('host', 'finger.remote.xn--kgbechtv');
    expect(queriedProperties).toHaveProperty('uri', 'https://remote.xn--kgbechtv/@name%20of%20user');
    expect(queriedProperties).toHaveProperty(['inbox', 'uri', 'id'], properties.inbox.uri.id);
    expect(queriedProperties).toHaveProperty(['publicKey', 'uri', 'id'], properties.publicKey.uri.id);
    expect(queriedProperties).toHaveProperty(['publicKey', 'publicKeyPem'],  `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`);
  });

  test('rejects if username is invalid', () => expect(RemotePerson.create(
    repository,
    '',
    'finger.remote.xn--kgbechtv',
    'https://remote.xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D',
    { uri: 'https://remote.xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D/inbox' },
    {
      uri: 'https://remote.xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D#key',
      publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`
    })).rejects.toBeInstanceOf(Error));
});
