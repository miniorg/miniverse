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
import repository from '../test/repository';
import RemoteAccount from './remote_account';

const { signal } = new AbortController;

describe('create', () => {
  test('creates and resolves with an account', async () => {
    const recover = jest.fn();
    const account = await RemoteAccount.create(repository, {
      actor: {
        username: 'name of user',
        host: 'finger.remote.xn--kgbechtv',
        name: '',
        summary: '<script>alert("XSS")</script>'
      },
      uri: 'https://remote.xn--kgbechtv/@name%20of%20user',
      inbox: { uri: 'https://remote.xn--kgbechtv/@name%20of%20user/inbox' },
      publicKey: {
        uri: 'https://remote.xn--kgbechtv/@name%20of%20user#key',
        publicKeyDer: createPublicKey(`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`).export({ format: 'der', type: 'pkcs1' })
      }
    }, signal, recover);

    expect(account).toBeInstanceOf(RemoteAccount);
    expect(account).toHaveProperty('repository', repository);
    expect(account).toHaveProperty(['actor', 'repository'], repository);
    expect(account).toHaveProperty(['actor', 'username'], 'name of user');
    expect(account).toHaveProperty(['actor', 'host'],
      'finger.remote.xn--kgbechtv');
    expect(account).toHaveProperty(['actor', 'name'], '');
    expect(account).toHaveProperty(['actor', 'summary'], '');
    expect(account).toHaveProperty(['uri', 'uri'],
      'https://remote.xn--kgbechtv/@name%20of%20user');
    expect(account).toHaveProperty(['publicKeyURI', 'uri'],
      'https://remote.xn--kgbechtv/@name%20of%20user#key');
    expect(account).toHaveProperty('publicKeyDer', createPublicKey(`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`).export({ format: 'der', type: 'pkcs1' }));

    await expect(repository.selectRemoteAccountById(account.id, signal, recover))
      .resolves
      .toHaveProperty('publicKeyDer', createPublicKey(`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`).export({ format: 'der', type: 'pkcs1' }));

    expect(recover).not.toHaveBeenCalled();
  });

  test('rejects if username is invalid', async () => {
    const recovery = {};

    await expect(RemoteAccount.create(repository, {
      actor: {
        username: '',
        host: 'finger.remote.xn--kgbechtv',
        name: '',
        summary: ''
      },
      uri: 'https://remote.xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D',
      inbox: { uri: 'https://remote.xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D/inbox' },
      publicKey: {
        uri: 'https://remote.xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D#key',
        publicKeyDer: createPublicKey(`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`).export({ format: 'der', type: 'pkcs1' })
      }
    }, signal, () => recovery)).rejects.toBe(recovery);
  });
});
