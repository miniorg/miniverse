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

import nock from 'nock';
import LocalAccount from '../local_account';
import ParsedActivityStreams, { AnyHost } from '../parsed_activitystreams';
import RemoteAccount from '../remote_account';
import repository from '../test_repository';
import URI from '../uri';
import Person from './index';

describe('fromHostAndParsedActivityStreams', () => {
  test('creates and resolves with a person', async () => {
    const person = await Person.fromHostAndParsedActivityStreams(
      repository,
      'finger.remote.xn--kgbechtv',
      new ParsedActivityStreams(repository, {
        '@context': 'https://w3id.org/security/v1',
        id: 'https://remote.xn--kgbechtv/@preferred%20username',
        preferredUsername: 'preferred username',
        inbox: 'https://remote.xn--kgbechtv/@preferred%20username/inbox',
        publicKey: {
          id: 'https://remote.xn--kgbechtv/@preferred%20username#key',
          publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`
        }
      }, AnyHost));

    expect(person).toBeInstanceOf(Person);
    expect(person).toHaveProperty('username', 'preferred username');
    expect(person).toHaveProperty('host', 'finger.remote.xn--kgbechtv');
    expect(person).toHaveProperty(['account', 'uri', 'uri'], 'https://remote.xn--kgbechtv/@preferred%20username');
    expect(person).toHaveProperty(['account', 'inboxURI', 'uri'], 'https://remote.xn--kgbechtv/@preferred%20username/inbox');
    expect(person).toHaveProperty(['account', 'publicKeyURI', 'uri'], 'https://remote.xn--kgbechtv/@preferred%20username#key');
    expect(person).toHaveProperty(['account', 'publicKeyPem'], `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`);
  });

  test('rejects if host of its own ID and ID of public key mismatches', () => {
    return expect(Person.fromHostAndParsedActivityStreams(
      repository,
      'finger.remote.xn--kgbechtv',
      new ParsedActivityStreams(repository, {
        '@context': 'https://w3id.org/security/v1',
        id: 'https://remote.xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D',
        preferredUsername: 'ユーザー名',
        inbox: 'https://remote.xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D/inbox',
        publicKey: {
          id: 'https://publickey.remote.xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D#key',
          publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`
        }
      }, AnyHost))).rejects.toBeInstanceOf(Error);
  });

  test('rejects if its context does not include https://w3id.org/security/v1', () =>
    expect(Person.fromHostAndParsedActivityStreams(
      repository,
      'finger.remote.xn--kgbechtv',
      new ParsedActivityStreams(repository, {
        id: 'https://remote.xn--kgbechtv/@preferred%20username',
        preferredUsername: 'preferred username',
        inbox: 'https://remote.xn--kgbechtv/@preferred%20username/inbox',
        publicKey: {
          id: 'https://remote.xn--kgbechtv/@preferred%20username#key',
          publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`
        }
      }, AnyHost))).rejects.toBeInstanceOf(Error));
});

describe('fromParsedActivityStreams', () => {
  test('resolves local person', async () => {
    const person = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'UsErNaMe',
      host: null
    });

    await repository.insertLocalAccount(person.account);

    await expect(Person.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, 'https://xn--kgbechtv/@UsErNaMe')))
        .resolves
        .toHaveProperty('id', person.id);
  });

  test('resolves with null if URI is for local person not present', () =>
    expect(Person.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, 'https://xn--kgbechtv/@UsErNaMe')))
        .resolves
        .toBe(null));

  test('resolves remote person already fetched', async () => {
    const person = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: '' }),
        publicKeyURI: new URI({ repository, uri: '' }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/' })
      }),
      username: 'UsErNaMe',
      host: 'FiNgEr.ReMoTe.إختبار'
    });

    await repository.insertRemoteAccount(person.account);

    await expect(Person.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, 'https://ReMoTe.إختبار/')))
        .resolves
        .toHaveProperty('id', person.id);
  });

  test('resolves remote person not fetched yet', async () => {
    const webfinger = {
      subject: `acct:preferred%20username@FiNgEr.ReMoTe.xn--kgbechtv`,
      links: [
        {
          rel: 'self',
          href: 'https://remote.xn--kgbechtv/@preferred%20username',
        }
      ]
    };

    try {
      // See if it correctly encodes username
      nock('https://finger.remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=acct%3Apreferred%2520username%40FiNgEr.ReMoTe.xn--kgbechtv')
        .reply(200, webfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=https%3A%2F%2Fremote.xn--kgbechtv%2F%40preferred%2520username')
        .reply(200, webfinger);

      await expect(Person.fromParsedActivityStreams(
        repository,
        new ParsedActivityStreams(repository, {
          '@context': 'https://w3id.org/security/v1',
          id: 'https://remote.xn--kgbechtv/@preferred%20username',
          preferredUsername: 'preferred username',
          inbox: 'https://remote.xn--kgbechtv/@preferred%20username/inbox',
          publicKey: {
            id: 'https://remote.xn--kgbechtv/@preferred%20username#key',
            publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`
          }
        }, AnyHost))).resolves.toHaveProperty(
          ['account', 'uri', 'uri'],
          'https://remote.xn--kgbechtv/@preferred%20username');
    } finally {
      nock.cleanAll();
    }
  });

  test('rejects if WebFinger representations for acct URI and ActivityStreams URI mismatches', async () => {
    const webfinger = {
      subject: `acct:preferred%20username@FiNgEr.ReMoTe.xn--kgbechtv`,
      links: [
        {
          rel: 'self',
          href: 'https://remote.xn--kgbechtv/@preferred%20username',
        }
      ]
    };

    const realWebfinger = {
      subject: `acct:preferred%20username@FiNgEr.ReMoTe.xn--kgbechtv`,
      links: [
        {
          rel: 'self',
          href: 'https://real.remote.xn--kgbechtv/@preferred%20username',
        }
      ]
    };

    const activitystreams = {
      '@context': 'https://w3id.org/security/v1',
      type: 'Person',
      id: 'https://remote.xn--kgbechtv/@preferred%20username',
      preferredUsername: 'preferred username',
      inbox: 'https://remote.xn--kgbechtv/@preferred%20username/inbox',
      publicKey: {
        type: 'Key',
        id: 'https://remote.xn--kgbechtv/@preferred%20username#key',
        owner: 'https://remote.xn--kgbechtv/@preferred%20username',
        publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`
      }
    };

    try {
      // See if it correctly encodes username
      nock('https://finger.remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=acct:preferred%20username@FiNgEr.ReMoTe.xn--kgbechtv')
        .reply(200, realWebfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=https://remote.xn--kgbechtv/@preferred%20username')
        .reply(200, webfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/@preferred%20username')
        .reply(200, activitystreams);

      await expect(Person.resolveByKeyUri(repository, 'https://remote.xn--kgbechtv/@preferred%20username#key'))
        .rejects
        .toBeInstanceOf(Error);
    } finally {
      nock.cleanAll();
    }
  });
});
