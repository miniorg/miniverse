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

import Key, { generate } from './key';
import {
  fabricateLocalAccount,
  fabricateRemoteAccount
} from './test/fabricator';
import repository from './test/repository';

const keyPair = {
  privateKeyPem: `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGT
rcO6S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyO
iSyFZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2
/POH8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ss
c1bCka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxi
B0te+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQABAoIBACCmoGky9sYfIqm9
vmPn0ockva0b6o5SbmPyq6rzcNlb4bsspR0LZXoDiWd2SpDfHk2qgQ4UiVluX+I5
QGwyjHrJztE+Ci3C/hgCPK1nJEsh+8jA91kgZKxUiJjZvkA8OyLFrYO07NAALnSd
I3ogDGXuUDa4ga2bUW8Iq87YRJIcRBNpT91vlUMPGTY/cvEXpSXFvr86ozuTmqAh
Ccp/7WmbQiQEozJJbpJeLbGPiBEF3hP3oBXkKl7GenpseccgtfiZzm4IySnfaNr2
Tc5DcJiw5z6w7lxZE0JIyRJdYTsTTLEP96QddOrI7pfrk/03fcJ1/jVIMdGt6xLv
Qqb6XcECgYEA+wsqKQDJNHCJnjA3MKg6N6wNCUl3I5Fo8p0Vod6sGqZngLrZ8fTP
9t+49kM04E9TBI2J5wb/1nnoLtfkm6tdo9xEM2YDtpDfmdjwWdGqe/QXDVFIT/oK
Oh8iM7TOYnd0l+5VKrHa3VLSgpYpA9Lq4PWRI3n7SLr4nGL6YTEiv9sCgYEA1Tgw
UZ5S+4k+MbzQ8Tz0awTLAaZuULwAMm3B5Pku7SsRefvWYinc0362rBZrq9obkTDQ
efDpM4+sKKSWyT05wig4Ad2608M1AWvBn0H7Unx/HqBK+QlRh1N7CSoaLHM1/cHq
xcPgcjsdKSaUStBIwRZh3+csV4Xb19pPMQRL8vECgYEAnokXb9tyNO6YydAzGkQy
t7Osa9/8H/cVKpmu7pE7aH0Lwgy91AHBT2tLWCFrA/i0OZzUqJQP/rbvvJ1UXkZj
FTblzvuufp2Qx4xrhJ1Wp36nDB73pqIF0VyV8cdNynsbo1K8cADvcXN7Q0Jm1mZd
NAGATcIbwXtpwwDyk2w/QJ8CgYBIjsxymewnSPbvOg/oaBPM716d+yMDOlbe0lbv
MpTzhHp4BmlYEmLhXfeP7DlLy/chm3j2ZjMVpsixNAFUDg+/sKwOhoPzWDSLfT3w
kiWSVmdz5pxczvz9jj0KS1eI1NQEvJ7GGfghJ1ivDj/cjbCUdKdt6F9AkX7Un6ff
SFUIIQKBgBBMvSxRcDCiF5hdV2jVSmFMrdy6mt8kLWZh+vGUu5OOGXIn8xqDeqze
PtM8uICJERUD+p/WiEmEyC3Pd8F7db3zxt34L5BhQ5w2HnPpumDTGNUeuV4byF4z
OyJRYe+sFKZ6lXqnwdWuTrxTNucFuhw+6BVyzNn6lI5cNXLr1reH
-----END RSA PRIVATE KEY-----
`,
  publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`
};

describe('getUri', () => {
  test('loads and returns URI of local key', async () => {
    const owner =
      await fabricateLocalAccount({ person: { username: '所有者' } });

    const key = new Key({ ownerId: owner.person.id, repository });

    /*
      The host name should only be consisted with ASCII characters valid as
      HTTP header field parameter. Username should be encoded, too.

      Mastodon requires the key to be a fragment of a person:
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

    const key = new Key({ ownerId: owner.person.id, repository });

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
      publicKeyPem: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2NWebZ1RV7DEvjfJNnTH
BofamHENMJd3+aWIXtccUyyPBzfvzyfTXqYfDZUmjei0D5JCJ/ww9Y6ulgBA9Pdx
1Iu2LbvQ6iE19RM01An3kBA/MPelQATPv832/pWxdCjWPP8i2snPbzPZ5gSJP55v
Qj2TY8ZUxWq8rVaCB1+87Kiq88Q/ShS6nCgnph4JSLhAcvSGuSbd+YI8/i1ArQZr
aiM3niRO1Dwz7XPszQ8ygbLWdqM/2pAvckp/lIUm0ufVz5ONGcqjZDVUNh/ZQ5tO
AOc6sswdQZB3Q0FHFgaM5FkAeB07OSK+ndZffVfqfe5YM39470E9uGqC3NQYVkGH
ewIDAQAB
-----END PUBLIC KEY-----
`
    });

    const key = new Key({ ownerId: owner.person.id, repository });

    await expect(key.verifySignature(signature)).resolves.toBe(true);
  });

  test('loads account and returns false if signature is invalid', async () => {
    const owner = await fabricateRemoteAccount({
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

    const key = new Key({ ownerId: owner.person.id, repository });

    await expect(key.verifySignature(signature))
      .resolves
      .toBe(false);
  });
});

describe('selectPrivateKeyPem', () =>
  test('loads and returns private key in PEM', async () => {
    const { privateKeyPem } = keyPair;
    const owner = await fabricateLocalAccount({ privateKeyPem });
    const key = new Key({ ownerId: owner.person.id, repository });

    await expect(key.selectPrivateKeyPem()).resolves.toBe(privateKeyPem);
  }));

describe('toActivityStreams', () =>
  test('returns ActivityStreams representation', async () => {
    const owner = await fabricateLocalAccount({
      person: { username: '' },
      privateKeyPem: keyPair.privateKeyPem
    });

    const key = new Key({ ownerId: owner.person.id, repository });

    await expect(key.toActivityStreams()).resolves.toEqual({
      id: 'https://xn--kgbechtv/@#key',
      type: 'Key',
      owner: 'https://xn--kgbechtv/@',
      publicKeyPem: keyPair.publicKeyPem
    });
  }));

describe('generate', () => test('returns a string', () =>
  expect(generate()).toMatch(/^-----BEGIN RSA PRIVATE KEY-----\n(.|\n)*\n-----END RSA PRIVATE KEY-----\n$/)));

