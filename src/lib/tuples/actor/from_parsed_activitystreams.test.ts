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

import { AbortController } from 'abort-controller';
import { createPublicKey } from 'crypto';
import ParsedActivityStreams, { anyHost } from '../../parsed_activitystreams';
import {
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../../test/fabricator';
import repository from '../../test/repository';
import { unwrap } from '../../test/types';
import Actor from './index';
import { unexpectedType } from './base';
import nock = require('nock');

const { signal } = new AbortController;

describe('createFromHostAndParsedActivityStreams', () => {
  test('creates and resolves with an actor', async () => {
    const recover = jest.fn();
    const actor = await Actor.createFromHostAndParsedActivityStreams(
      repository,
      'finger.remote.xn--kgbechtv',
      new ParsedActivityStreams(repository, {
        '@context': 'https://w3id.org/security/v1',
        id: 'https://remote.xn--kgbechtv/@preferred%20username',
        type: 'Person',
        preferredUsername: 'preferred username',
        name: '',
        summary: '',
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
      }, anyHost), signal, recover);

    expect(recover).not.toHaveBeenCalled();
    expect(actor).toBeInstanceOf(Actor);
    expect(actor).toHaveProperty('username', 'preferred username');
    expect(actor).toHaveProperty('host', 'finger.remote.xn--kgbechtv');
    expect(actor).toHaveProperty('name', '');
    expect(actor).toHaveProperty('summary', '');
    expect(actor).toHaveProperty(['account', 'uri', 'uri'], 'https://remote.xn--kgbechtv/@preferred%20username');
    expect(actor).toHaveProperty(['account', 'inboxURI', 'uri'], 'https://remote.xn--kgbechtv/@preferred%20username/inbox');
    expect(actor).toHaveProperty(['account', 'publicKeyURI', 'uri'], 'https://remote.xn--kgbechtv/@preferred%20username#key');
    expect(actor).toHaveProperty(['account', 'publicKeyDer'], createPublicKey(`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`).export({ format: 'der', type: 'pkcs1' }));
  });

  /*
    ActivityPub
    4. Actors
    https://www.w3.org/TR/activitypub/#actors
    > ActivityPub actors are generally one of the ActivityStreams Actor Types,
    > but they don't have to be. For example, a Profile object might be used as
    > an actor, or a type from an ActivityStreams extension. Actors are
    > retrieved like any other Object in ActivityPub.

    Activity Vocabulary
    3.2 Actor Types
    https://www.w3.org/TR/activitystreams-vocabulary/#actor-types
    > The core Actor Types include:
    >
    > * Application
    > * Group
    > * Organization
    > * Person
    > * Service
  */
  test('rejects if type is not an actor type', () => {
    const recovery = {};

    expect(Actor.createFromHostAndParsedActivityStreams(
      repository,
      'finger.remote.xn--kgbechtv',
      new ParsedActivityStreams(repository, {
        '@context': 'https://w3id.org/security/v1',
        id: 'https://remote.xn--kgbechtv/@preferred%20username',
        preferredUsername: 'preferred username',
        name: '',
        summary: '',
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
      }, anyHost), signal, error => {
        expect(error[unexpectedType]).toBe(true);
        return recovery;
      })).rejects.toBe(recovery);
  });

  test('rejects if host of its own ID and ID of public key mismatches', () => {
    const recovery = {};

    return expect(Actor.createFromHostAndParsedActivityStreams(
      repository,
      'finger.remote.xn--kgbechtv',
      new ParsedActivityStreams(repository, {
        '@context': 'https://w3id.org/security/v1',
        id: 'https://remote.xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D',
        type: 'Person',
        preferredUsername: 'ユーザー名',
        name: '',
        summary: '',
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
      }, anyHost), signal, () => recovery)).rejects.toBe(recovery);
  });

  test('rejects if its context does not include https://w3id.org/security/v1', () => {
    const recovery = {};

    expect(Actor.createFromHostAndParsedActivityStreams(
      repository,
      'finger.remote.xn--kgbechtv',
      new ParsedActivityStreams(repository, {
        id: 'https://remote.xn--kgbechtv/@preferred%20username',
        type: 'Person',
        preferredUsername: 'preferred username',
        name: '',
        summary: '',
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
      }, anyHost), signal, () => recovery)).rejects.toBe(recovery);
  });
});

describe('fromParsedActivityStreams', () => {
  test('resolves local actor', async () => {
    const account =
      await fabricateLocalAccount({ actor: { username: 'UsErNaMe' } });

    const recover = jest.fn();
    const { id } = unwrap(await account.select('actor', signal, recover));

    await expect(Actor.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://xn--kgbechtv/@UsErNaMe',
        anyHost), signal, recover))
      .resolves.toHaveProperty('id', id);

    expect(recover).not.toHaveBeenCalled();
  });

  test('resolves with null if URI is for local actor not present', async () => {
    const recover = jest.fn();

    await expect(Actor.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, 'https://xn--kgbechtv/@UsErNaMe', anyHost),
      signal,
      recover))
      .resolves
      .toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });

  test('resolves remote actor already fetched', async () => {
    const recover = jest.fn();
    const { id } = await fabricateRemoteAccount(
      { uri: 'https://ReMoTe.إختبار/' });

    await expect(Actor.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, 'https://ReMoTe.إختبار/', anyHost),
      signal,
      recover))
      .resolves
      .toHaveProperty('id', id);

    expect(recover).not.toHaveBeenCalled();
  });

  test('resolves remote actor not fetched yet', async () => {
    const recover = jest.fn();
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

      await expect(Actor.fromParsedActivityStreams(repository, new ParsedActivityStreams(repository, {
        '@context': 'https://w3id.org/security/v1',
        id: 'https://remote.xn--kgbechtv/@preferred%20username',
        type: 'Person',
        preferredUsername: 'preferred username',
        name: '',
        summary: '',
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
      }, anyHost), signal, recover)).resolves.toHaveProperty(
        ['account', 'uri', 'uri'],
        'https://remote.xn--kgbechtv/@preferred%20username');
    } finally {
      nock.cleanAll();
    }

    expect(recover).not.toHaveBeenCalled();
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
      name: '',
      summary: '',
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

    const recovery = {};

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

      await expect(Actor.fromKeyUri(repository, 'https://remote.xn--kgbechtv/@preferred%20username#key', signal, () => recovery))
        .rejects
        .toBe(recovery);
    } finally {
      nock.cleanAll();
    }
  });
});
