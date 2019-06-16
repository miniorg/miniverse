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
import RemoteAccount from '../tuples/remote_account';
import { conflict } from '.';

const promisifiedGenerateKeyPair = promisify(generateKeyPair);

async function testInsertAndQuery(query: (account: RemoteAccount) => Promise<RemoteAccount>) {
  const inserted = await fabricateRemoteAccount({
    actor: {
      username: 'username',
      host: 'FiNgEr.ReMoTe.xn--kgbechtv'
    },
    inbox: { uri: 'https://ReMoTe.إختبار/inbox' },
    publicKey: {
      uri: 'https://ReMoTe.إختبار/publickey',
      publicKeyDer: createPublicKey(`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`).export({ format: 'der', type: 'pkcs1' })
    },
    uri: 'https://ReMoTe.إختبار/'
  });

  const queried = await query(inserted);

  expect(queried).toHaveProperty('inboxURIId', inserted.inboxURIId);
  expect(queried).toHaveProperty('publicKeyURIId', inserted.publicKeyURIId);
  expect(queried).toHaveProperty('publicKeyDer', createPublicKey(`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`).export({ format: 'der', type: 'pkcs1' }));
  expect(queried).toHaveProperty('repository', repository);

  return queried;
}

test('inserts account and allows to query one by key URI', () =>
  testInsertAndQuery(account => account.select('publicKeyURI').then(uri =>
    repository.selectRemoteAccountByKeyUri(unwrap(uri))).then(unwrap)));

test('inserts account and allows to query one by its id', () =>
  testInsertAndQuery(({ id }) =>
    repository.selectRemoteAccountById(id).then(unwrap)));

test('inserts accounts with common inbox URI', async () => {
  await expect(fabricateRemoteAccount({
    inbox: { uri: 'https://ReMoTe.إختبار/inbox' }
  })).resolves.toBeInstanceOf(RemoteAccount);

  await expect(fabricateRemoteAccount({
    inbox: { uri: 'https://ReMoTe.إختبار/inbox' }
  })).resolves.toBeInstanceOf(RemoteAccount);
});

test('inserts accounts with inbox whose URI is reserved for note inReplyTo', async () => {
  const account = await fabricateLocalAccount();

  const recover = jest.fn();
  const reply = await repository.insertNote({
    status: {
      published: new Date,
      actor: unwrap(await account.select('actor')),
      uri: null
    },
    summary: null,
    content: '',
    inReplyTo: { id: null, uri: 'https://ReMoTe.إختبار/' },
    attachments: [],
    hashtags: [],
    mentions: []
  }, recover);

  expect(recover).not.toHaveBeenCalled();

  await expect(fabricateRemoteAccount({
    inbox: { uri: 'https://ReMoTe.إختبار/inbox' }
  })).resolves.not.toHaveProperty('inboxURIId', reply.inReplyToId);
});

test('inserts accounts with key whose URI is reserved for note inReplyTo', async () => {
  const account = await fabricateLocalAccount();

  const recover = jest.fn();
  const reply = await repository.insertNote({
    status: {
      published: new Date,
      actor: unwrap(await account.select('actor')),
      uri: null
    },
    summary: null,
    content: '',
    inReplyTo: { id: null, uri: 'https://ReMoTe.إختبار/' },
    attachments: [],
    hashtags: [],
    mentions: []
  }, recover);

  expect(recover).not.toHaveBeenCalled();

  await expect(fabricateRemoteAccount({
    publicKey: { uri: 'https://ReMoTe.إختبار/inbox' }
  })).resolves.not.toHaveProperty('publicKeyURIId', reply.inReplyToId);
});

describe('selectRemoteAccountById', () => {
  test('returns null if remote account is not associated', () =>
    expect(repository.selectRemoteAccountById('0')).resolves.toBe(null));
});

describe('selectRemoteAccountByKeyUri', () => {
  test('returns null if not found', () =>
    expect(repository.selectRemoteAccountByKeyUri({
      id: '0',
      allocated: true,
      uri: '0'
    })).resolves.toBe(null));
});

test('rejects when inserting remote account with conflicting URI', async () => {
  const recover = jest.fn();
  const recovery = {};

  await repository.insertRemoteAccount({
    actor: {
      username: 'first',
      host: 'FiNgEr.ReMoTe.إختبار',
      name: '',
      summary: ''
    },
    uri: 'https://ReMoTe.إختبار/AcCoUnT/first',
    inbox: { uri: 'https://ReMoTe.إختبار/InBoX/first' },
    publicKey: {
      uri: 'https://ReMoTe.إختبار/KeY/first',
      publicKeyDer: (await promisifiedGenerateKeyPair('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { format: 'der', type: 'pkcs1' }
      })).publicKey,
    }
  }, recover);

  expect(recover).not.toHaveBeenCalled();

  await expect(repository.insertRemoteAccount({
    actor: {
      username: 'second',
      host: 'FiNgEr.ReMoTe.إختبار',
      name: '',
      summary: ''
    },
    uri: 'https://ReMoTe.إختبار/AcCoUnT/first',
    inbox: { uri: 'https://ReMoTe.إختبار/InBoX/second' },
    publicKey: {
      uri: 'https://ReMoTe.إختبار/KeY/second',
      publicKeyDer: (await promisifiedGenerateKeyPair('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { format: 'der', type: 'pkcs1' }
      })).publicKey,
    }
  }, error => {
    expect(error[conflict]).toBe(true);
    return recovery;
  })).rejects.toBe(recovery);
});
