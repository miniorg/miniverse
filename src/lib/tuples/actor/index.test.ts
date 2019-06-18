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
import { createPrivateKey } from 'crypto';
import {
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../../test/fabricator';
import repository from '../../test/repository';
import { unwrap } from '../../test/types';
import Actor from './index';

const privateKeyDer = createPrivateKey(`-----BEGIN RSA PRIVATE KEY-----
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
`).export({ format: 'der', type: 'pkcs1' });

const { signal } = new AbortController;

/*
  RFC 7565 - The 'acct' URI Scheme
  7. IANA Considerations
  https://tools.ietf.org/html/rfc7565#section-7
*/
describe('validateUsername', () => {
  for (const username of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~!$&\'()*+,;=') {
    test(`accepts if username which starts with ${username}`, () => {
      const recover = jest.fn();
      Actor.validateUsername(username, recover);
      expect(recover).not.toHaveBeenCalled();
    });
  }

  test('throws an error if username has invalid first character', () => {
    const recovery = new Error;
    expect(() => Actor.validateUsername('無効', () => recovery)).toThrow(recovery);
  });
});

describe('getUri', () => {
  test('returns URI of local account', async () => {
    const recover = jest.fn();
    const account = await fabricateLocalAccount(
      { actor: { username: 'ユーザー名', name: '' } });

    const actor = unwrap(await account.select('actor', signal, recover));

    // host and username must be encoded.
    await expect(actor.getUri(signal, recover))
      .resolves
      .toBe('https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D');

    expect(recover).not.toHaveBeenCalled();
  });

  test('loads and returns URI of remote account', async () => {
    const recover = jest.fn();
    const { id } = await fabricateRemoteAccount({ uri: 'https://ReMoTe.إختبار/' });
    const actor = unwrap(await repository.selectActorById(id, signal, recover));

    await expect(actor.getUri(signal, recover))
      .resolves
      .toBe('https://ReMoTe.إختبار/');

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('toActivityStreams', () => {
  test('loads and returns ActivityStreams representation of local account', async () => {
    const account = await fabricateLocalAccount({
      actor: { username: 'ユーザー名', name: '' },
      admin: true,
      privateKeyDer,
      salt: Buffer.from('salt')
    });

    const recover = jest.fn();
    const actor = unwrap(await account.select('actor', signal, recover));

    // URIs must properly be encoded.
    await expect(actor.toActivityStreams(signal, recover)).resolves.toEqual({
      id: 'https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D',
      type: 'Person',
      preferredUsername: 'ユーザー名',
      name: '',
      summary: '',
      inbox: 'https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D/inbox',
      outbox: 'https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D/outbox',
      publicKey: {
        id: 'https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D#key',
        type: 'Key',
        owner: 'https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D',
        publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`,
      },
      endpoints: { proxyUrl: 'https://xn--kgbechtv/api/proxy' },
      'miniverse:salt': 'c2FsdA=='
    });

    expect(recover).not.toHaveBeenCalled();
  });

  test('returns ActivityStreams representation of remote account', async () => {
    const account = await fabricateRemoteAccount({
      actor: {
        username: 'ユーザー名',
        host: 'FiNgEr.ReMoTe.إختبار',
        name: '',
        summary: ''
      },
      uri: 'https://ReMoTe.xn--kgbechtv/'
    });

    const recover = jest.fn();
    const actor = unwrap(await account.select('actor', signal, recover));

    // URIs must properly be encoded.
    await expect(actor.toActivityStreams(signal, recover)).resolves.toEqual({
      id: 'https://ReMoTe.xn--kgbechtv/',
      preferredUsername: 'ユーザー名',
      name: '',
      summary: '',
      inbox: 'https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D@finger.remote.%D8%A5%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1/inbox',
      outbox: 'https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D@finger.remote.%D8%A5%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1/outbox',
    });

    expect(recover).not.toHaveBeenCalled();
  });
});
