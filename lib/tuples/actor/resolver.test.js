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

import { Custom as CustomError } from '../../errors';
import {
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../../test/fabricator';
import repository from '../../test/repository';
import Actor from './index';
import { lookup } from './resolver';

const nock = require('nock');

describe('lookup', () => {
  test('looks up acct scheme URI', async () => {
    const webfinger = {
      subject: 'acct:preferred%20username@FiNgEr.ReMoTe.xn--kgbechtv',
      links: [
        {
          rel: 'self',
          href: 'https://remote.xn--kgbechtv/@preferred%20username',
        }
      ]
    };

    nock('https://finger.remote.xn--kgbechtv')
      .get('/.well-known/webfinger?resource=acct%3Apreferred%2520username%40FiNgEr.ReMoTe.xn--kgbechtv')
      .reply(200, webfinger);

    try {
      await expect(lookup(repository, 'acct:preferred%20username@FiNgEr.ReMoTe.xn--kgbechtv'))
        .resolves
        .toEqual(webfinger);
    } finally {
      nock.cleanAll();
    }
  });

  test('looks up https scheme URI', async () => {
    const webfinger = {
      subject: 'acct:preferred%20username@FiNgEr.ReMoTe.xn--kgbechtv',
      links: [
        {
          rel: 'self',
          href: 'https://remote.xn--kgbechtv/@preferred%20username',
        }
      ]
    };

    nock('https://remote.xn--kgbechtv')
      .get('/.well-known/webfinger?resource=https%3A%2F%2Fremote.xn--kgbechtv%2F%40preferred%2520username')
      .reply(200, webfinger);

    try {
      await expect(lookup(repository, 'https://remote.xn--kgbechtv/@preferred%20username'))
        .resolves
        .toEqual(webfinger);
    } finally {
      nock.cleanAll();
    }
  });
});

describe('resolveByUsernameAndNormalizedHost', () => {
  test('resolves local actor', async () => {
    const account =
      await fabricateLocalAccount({ actor: { username: 'username' } });

    await expect(Actor.resolveByUsernameAndNormalizedHost(repository, 'username', null))
      .resolves
      .toHaveProperty('id', account.id);
  });

  test('resolves remote account already fetched', async () => {
    const account = await fabricateRemoteAccount(
      { actor: { username: 'username', host: 'FiNgEr.ReMoTe.xn--kgbechtv' } });

    await expect(Actor.resolveByUsernameAndNormalizedHost(repository, 'username', 'finger.remote.xn--kgbechtv'))
      .resolves
      .toHaveProperty('id', account.id);
  });

  test('resolves remote account not fetched yet', async () => {
    const webfinger = {
      subject: 'acct:preferred%20username@FiNgEr.ReMoTe.xn--kgbechtv',
      links: [
        {
          rel: 'self',
          href: 'https://remote.xn--kgbechtv/@preferred%20username',
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
    };

    try {
      // See if it correctly encodes username
      nock('https://finger.remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=acct%3Apreferred%2520username%40finger.remote.xn--kgbechtv')
        .reply(200, webfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=https%3A%2F%2Fremote.xn--kgbechtv%2F%40preferred%2520username')
        .reply(200, webfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/@preferred%20username')
        .reply(200, activitystreams);

      const actor = await Actor.resolveByUsernameAndNormalizedHost(
        repository,
        'preferred username',
        'finger.remote.xn--kgbechtv');

       expect(actor).toHaveProperty('username', 'preferred username');
       expect(actor).toHaveProperty('host', 'FiNgEr.ReMoTe.xn--kgbechtv');
       expect(actor).toHaveProperty('name', '');
       expect(actor).toHaveProperty('summary', '');
    } finally {
      nock.cleanAll();
    }
  });

  test('rejects if WebFinger representations for acct URI and ActivityStreams URI mismatches', async () => {
    const webfinger = {
      subject: 'acct:preferred%20username@finger.remote.xn--kgbechtv',
      links: [
        {
          rel: 'self',
          href: 'https://remote.xn--kgbechtv/@preferred%20username',
        }
      ]
    };

    const realWebfinger = {
      subject: 'acct:preferred%20username@real.finger.remote.xn--kgbechtv',
      links: [
        {
          rel: 'self',
          href: 'https://remote.xn--kgbechtv/@preferred%20username',
        }
      ]
    };

    const activitystreams = {
      type: 'Person',
      id: 'https://remote.xn--kgbechtv/@preferred%20username',
      preferredUsername: 'preferred username',
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
    };

    try {
      nock('https://finger.remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=acct%3Apreferred%2520username%40FiNgEr.ReMoTe.xn--kgbechtv')
        .reply(200, webfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=https%3A%2F%2Fremote.xn--kgbechtv%2F%40preferred%2520username')
        .reply(200, realWebfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/@preferred%20username')
        .reply(200, activitystreams);

      await expect(Actor.resolveByUsernameAndNormalizedHost(repository, 'preferred username', 'finger.remote.xn--kgbechtv'))
        .rejects
        .toBeInstanceOf(CustomError);
    } finally {
      nock.cleanAll();
    }
  });
});

describe('resolveByKeyUri', () => {
  test('resolves remote account already fetched', async () => {
    const { actor } = await fabricateRemoteAccount({
      publicKeyURI: {
        uri: 'https://remote.xn--kgbechtv/@preferred%20username#key'
      }
    });

    await expect(Actor.resolveByKeyUri(repository, 'https://remote.xn--kgbechtv/@preferred%20username#key'))
      .resolves
      .toHaveProperty('id', actor.id);
  });

  test('resolves remote account not fetched yet', async () => {
    const webfinger = {
      subject: 'acct:preferred%20username@FiNgEr.ReMoTe.xn--kgbechtv',
      links: [
        {
          rel: 'self',
          href: 'https://remote.xn--kgbechtv/@preferred%20username',
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

    try {
      nock('https://finger.remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=acct%3Apreferred%2520username%40FiNgEr.ReMoTe.xn--kgbechtv')
        .reply(200, webfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=https%3A%2F%2Fremote.xn--kgbechtv%2F%40preferred%2520username')
        .reply(200, webfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/@preferred%20username')
        .reply(200, activitystreams);

      const actor = await Actor.resolveByKeyUri(
        repository,
        'https://remote.xn--kgbechtv/@preferred%20username#key');

       expect(actor).toHaveProperty('username', 'preferred username');
       expect(actor).toHaveProperty('host', 'FiNgEr.ReMoTe.xn--kgbechtv');
       expect(actor).toHaveProperty('name', '');
    } finally {
      nock.cleanAll();
    }
  });

  test('rejects if given key URI and actual key URI mismatches', async () => {
    const webfinger = {
      subject: 'acct:preferred%20username@FiNgEr.ReMoTe.xn--kgbechtv',
      links: [
        {
          rel: 'self',
          href: 'https://remote.xn--kgbechtv/@preferred%20username',
        }
      ]
    };

    const activitystreams = {
      '@context': 'https://w3id.org/security/v1',
      type: 'Person',
      id: 'https://remote.xn--kgbechtv/@preferred%20username',
      preferredUsername: 'preferred username',
      summary: '',
      inbox: 'https://remote.xn--kgbechtv/@preferred%20username/inbox',
      publicKey: {
        type: 'Key',
        id: 'https://remote.xn--kgbechtv/@preferred%20username#yet-another-key',
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
        .get('/.well-known/webfinger?resource=acct%3Apreferred%2520username%40FiNgEr.ReMoTe.xn--kgbechtv')
        .reply(200, webfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/.well-known/webfinger?resource=https%3A%2F%2Fremote.xn--kgbechtv%2F%40preferred%2520username')
        .reply(200, webfinger);

      nock('https://remote.xn--kgbechtv')
        .get('/@preferred%20username')
        .reply(200, activitystreams);

      await expect(Actor.resolveByKeyUri(repository, 'https://remote.xn--kgbechtv/@preferred%20username#key'))
        .rejects
        .toBeInstanceOf(CustomError);
    } finally {
      nock.cleanAll();
    }
  });
});
