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

import Note from '../note';
import RemoteAccount from '../remote_account';
import Status from '../status';
import {
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';

async function testInsertAndQuery(query) {
  const inserted = await fabricateRemoteAccount({
    actor: {
      username: 'username',
      host: 'FiNgEr.ReMoTe.xn--kgbechtv'
    },
    inboxURI: { uri: 'https://ReMoTe.إختبار/inbox' },
    publicKeyURI: { uri: 'https://ReMoTe.إختبار/publickey' },
    publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`,
    uri: { uri: 'https://ReMoTe.إختبار/' }
  });

  const queried = await query(inserted);

  expect(queried).toHaveProperty('inboxURIId', inserted.inboxURIId);
  expect(queried).toHaveProperty('publicKeyURIId', inserted.publicKeyURIId);
  expect(queried).toHaveProperty('publicKeyPem', `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`);
  expect(queried).toHaveProperty('repository', repository);

  return queried;
}

test('inserts account and allows to query one by key URI', () =>
  testInsertAndQuery(({ publicKeyURI }) =>
    repository.selectRemoteAccountByKeyUri(publicKeyURI)));

test('inserts account and allows to query one by its id', () =>
  testInsertAndQuery(({ id }) =>
    repository.selectRemoteAccountById(id)));

test('inserts accounts with common inbox URI', async () => {
  await expect(fabricateRemoteAccount(
    { inboxURI: { uri: 'https://ReMoTe.إختبار/inbox' } }))
      .resolves
      .toBeInstanceOf(RemoteAccount);

  await expect(fabricateRemoteAccount(
    { inboxURI: { uri: 'https://ReMoTe.إختبار/inbox' } }))
      .resolves
      .toBeInstanceOf(RemoteAccount);
});

test('inserts accounts with inbox whose URI is reserved for note inReplyTo', async () => {
  const account = await fabricateLocalAccount();

  const reply = new Note({
    repository,
    status: new Status({
      repository,
      published: new Date,
      actor: unwrap(await account.select('actor'))
    }),
    summary: null,
    content: '',
    hashtags: [],
    mentions: []
  });

  await repository.insertNote(reply, 'https://ReMoTe.إختبار/');

  await expect(fabricateRemoteAccount(
    { inboxURI: { uri: 'https://ReMoTe.إختبار/inbox' } }))
      .resolves
      .not
      .toHaveProperty('inboxURIId', reply.inReplyToId);
});

test('inserts accounts with key whose URI is reserved for note inReplyTo', async () => {
  const account = await fabricateLocalAccount();

  const reply = new Note({
    repository,
    status: new Status({
      repository,
      published: new Date,
      actor: unwrap(await account.select('actor'))
    }),
    summary: null,
    content: '',
    hashtags: [],
    mentions: []
  });

  await repository.insertNote(reply, 'https://ReMoTe.إختبار/');

  await expect(fabricateRemoteAccount(
    { publicKeyURI: { uri: 'https://ReMoTe.إختبار/inbox' } }))
      .resolves
      .not
      .toHaveProperty('publicKeyURIId', reply.inReplyToId);
});

describe('selectRemoteAccountById', () =>
  test('returns null if remote account is not associated', () =>
    expect(repository.selectRemoteAccountById('0')).resolves.toBe(null)));

describe('selectRemoteAccountByKeyUri', () =>
  test('returns null if not found', () =>
    expect(repository.selectRemoteAccountByKeyUri('0')).resolves.toBe(null)));
