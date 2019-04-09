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

import { createPublicKey, generateKeyPair } from 'crypto';
import { promisify } from 'util';
import {
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Key from './key';

const keyPairPromise = promisify(generateKeyPair)('rsa', {
  modulusLength: 2048
});

describe('getUri', () => {
  test('loads and returns URI of local key', async () => {
    const owner = await fabricateLocalAccount({ actor: { username: '所有者' } });
    const key = new Key({ ownerId: unwrap(owner.id), repository });

    /*
      The host name should only be consisted with ASCII characters valid as
      HTTP header field parameter. Username should be encoded, too.

      Mastodon requires the key to be a fragment of an actor:
      Support more variations of ActivityPub keyId in signature (#4630) · tootsuite/mastodon@72bb3e0
      https://github.com/tootsuite/mastodon/commit/72bb3e03fdf4d8c886d41f3459000b336a3a362b
     */
    await expect(key.getUri())
      .resolves
      .toBe('https://xn--kgbechtv/@%E6%89%80%E6%9C%89%E8%80%85#key');
  });

  test('loads and returns URI of remote key', async () => {
    const owner = await fabricateRemoteAccount(
      { publicKeyURI: { uri: 'https://OwNeR.xn--kgbechtv/' } });

    const key = new Key({ ownerId: unwrap(owner.id), repository });

    await expect(key.getUri())
      .resolves
      .toBe('https://OwNeR.xn--kgbechtv/');
  });
});

describe('verifySignature', () => {
  const signature = {
    scheme: 'Signature',
    params: {
      keyId: 'https://OwNeR.إختبار/users/admin#main-key',
      algorithm: 'rsa-sha256',
      headers: [
        '(request-target)',
        'user-agent',
        'host',
        'date',
        'digest',
        'content-type'
      ],
      signature: 'ys5O1PsRhu2DRI4Uwki5lAJGM4uiridhllYTz19lGsWDcFvevQJJQUzFFgw5r8gJ4BZqD6ZXwYQCLWg26IuLjKRfYOksnIeTqOELGpWN2RjRUDHABMCpGmdhPps+6SY3QXdvVQGPz5DRidC/cJs4kW7t8QIkn/jom6I9D9gb37E87oXn2n2+6QvofyhWjyA422x/PUAfLsSz2hMvzG65BCwTFwVauDRFpKJRDjntyjlmKlC7YTQ4CorkorvqyHpAj8rmVRMfwu6t9XaSE+eqXZfcxTLLDyZwgtQzqnPdrkNOjSJoql+/qMVBIb0O4abx7NtQK7Cp14DKxDPSvWcUOA=='
    },
    signingString: `(request-target): post /@admin/inbox
user-agent: http.rb/3.2.0 (Mastodon/2.3.3; +http://localhost:3000/)
host: localhost
date: Wed, 02 May 2018 06:26:33 GMT
digest: SHA-256=7jyvsrynz1kc0SqwbXlaJBkcNkOtDSG8PGtyJkEfsig=
content-type: application/activity+json`,
    algorithm: 'RSA-SHA256',
    keyId: 'https://OwNeR.إختبار/users/admin#main-key'
  };

  test('loads account and returns true if signature is valid', async () => {
    const owner = await fabricateRemoteAccount({
      publicKeyDer: createPublicKey(`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2NWebZ1RV7DEvjfJNnTH
BofamHENMJd3+aWIXtccUyyPBzfvzyfTXqYfDZUmjei0D5JCJ/ww9Y6ulgBA9Pdx
1Iu2LbvQ6iE19RM01An3kBA/MPelQATPv832/pWxdCjWPP8i2snPbzPZ5gSJP55v
Qj2TY8ZUxWq8rVaCB1+87Kiq88Q/ShS6nCgnph4JSLhAcvSGuSbd+YI8/i1ArQZr
aiM3niRO1Dwz7XPszQ8ygbLWdqM/2pAvckp/lIUm0ufVz5ONGcqjZDVUNh/ZQ5tO
AOc6sswdQZB3Q0FHFgaM5FkAeB07OSK+ndZffVfqfe5YM39470E9uGqC3NQYVkGH
ewIDAQAB
-----END PUBLIC KEY-----
`).export({ format: 'der', type: 'pkcs1' })
    });

    const key = new Key({ ownerId: unwrap(owner.id), repository });

    await expect(key.verifySignature(signature)).resolves.toBe(true);
  });

  test('loads account and returns false if signature is invalid', async () => {
    const owner = await fabricateRemoteAccount({
      publicKeyDer: createPublicKey(`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`).export({ format: 'der', type: 'pkcs1' })
    });

    const key = new Key({ ownerId: unwrap(owner.id), repository });

    await expect(key.verifySignature(signature))
      .resolves
      .toBe(false);
  });
});

describe('selectPrivateKeyDer', () => {
  test('loads and returns private key in DER', async () => {
    const { privateKey } = await keyPairPromise;
    const privateKeyDer = privateKey.export({ format: 'der', type: 'pkcs1' });
    const owner = await fabricateLocalAccount({ privateKeyDer });
    const key = new Key({ ownerId: unwrap(owner.id), repository });
    const selectedPrivateKeyDer = await key.selectPrivateKeyDer();

    await expect(selectedPrivateKeyDer.equals(privateKeyDer)).toBe(true);
  });
});

describe('toActivityStreams', () => {
  test('returns ActivityStreams representation', async () => {
    const { publicKey, privateKey } = await keyPairPromise;

    const owner = await fabricateLocalAccount({
      actor: { username: '' },
      privateKeyDer: privateKey.export({ format: 'der', type: 'pkcs1' })
    });

    const key = new Key({ ownerId: unwrap(owner.id), repository });

    await expect(key.toActivityStreams()).resolves.toEqual({
      id: 'https://xn--kgbechtv/@#key',
      type: 'Key',
      owner: 'https://xn--kgbechtv/@',
      publicKeyPem: publicKey.export({ format: 'pem', type: 'pkcs1' })
    });
  });
});
