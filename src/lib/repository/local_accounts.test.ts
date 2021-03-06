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
  fabricateCookie,
  fabricateLocalAccount,
  fabricateNote
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import { conflict } from '.';

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

describe('selectLocalAccountByDigestOfCookie', () => {
  test('resolves with null if not found', async () => {
    const digest = Buffer.from([]);
    const recover = jest.fn();

    await expect(repository.selectLocalAccountByDigestOfCookie(
      digest,
      signal,
      recover
    )).resolves.toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('selectLocalAccountById', () => {
  test('resolves with null if not found', async () => {
    const recover = jest.fn();

    await expect(repository.selectLocalAccountById('0', signal, recover))
      .resolves.toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });
});

test('delivers objects to inboxses', async () => {
  const recover = jest.fn();
  const [account, note] = await Promise.all([
    fabricateLocalAccount(),
    fabricateNote({ content: '', mentions: [] })
  ]);

  let resolveMessage: (message: unknown) => void;
  const asyncMessage = new Promise<unknown>(resolve => resolveMessage = resolve);
  const [status] = await Promise.all([
    note.select('status', signal, recover).then(unwrap),
    repository.subscribe(
      repository.getInboxChannel(account),
      (_channel, message) => resolveMessage(JSON.parse(message)))
  ]);

  await repository.insertIntoInboxes([account], status, signal, recover);

  await Promise.all([
    expect(asyncMessage).resolves.toHaveProperty('type', 'Note'),
    expect(asyncMessage).resolves.toHaveProperty('content', ''),
    expect(asyncMessage).resolves.toHaveProperty('tag', []),
    repository.selectRecentStatusesIncludingExtensionsAndActorsFromInbox(
      account.id,
      signal,
      recover
    ).then(statuses => expect(statuses[0]).toHaveProperty('id', note.id))
  ]);
});

test('inserts cookie and allows to query account with its digest', async () => {
  const account = await fabricateLocalAccount({
    admin: true,
    privateKeyDer,
    salt: Buffer.from('salt'),
    serverKey: Buffer.from('serverKey'),
    storedKey: Buffer.from('storedKey')
  });

  const digest = Buffer.from('digest');
  await fabricateCookie({ account, digest });

  const recover = jest.fn();
  const queried = unwrap(await repository.selectLocalAccountByDigestOfCookie(
    digest, signal, recover));

  expect(recover).not.toHaveBeenCalled();
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', account.id);
  expect(queried).toHaveProperty('admin', true);
  expect(queried).toHaveProperty('privateKeyDer', privateKeyDer);
  expect(Buffer.from('salt').equals(queried.salt)).toBe(true);
  expect(Buffer.from('serverKey').equals(queried.serverKey)).toBe(true);
  expect(Buffer.from('storedKey').equals(queried.storedKey)).toBe(true);
});

test('inserts account allows to query one by its id', async () => {
  const { id } = await fabricateLocalAccount({
    admin: true,
    privateKeyDer,
    salt: Buffer.from('salt'),
    serverKey: Buffer.from('serverKey'),
    storedKey: Buffer.from('storedKey')
  });

  const recover = jest.fn();
  const queried =
    unwrap(await repository.selectLocalAccountById(id, signal, recover));

  expect(recover).not.toHaveBeenCalled();
  expect(queried).toHaveProperty('admin', true);
  expect(queried).toHaveProperty('id', id);
  expect(queried).toHaveProperty('privateKeyDer', privateKeyDer);
  expect(Buffer.from('salt').equals(queried.salt)).toBe(true);
  expect(Buffer.from('serverKey').equals(queried.serverKey)).toBe(true);
  expect(Buffer.from('storedKey').equals(queried.storedKey)).toBe(true);
});

test('rejects when inserting local account with conflicting username', async () => {
  const recover = jest.fn();
  const recovery = {};

  await repository.insertLocalAccount({
    actor: {
      username: 'username',
      name: '',
      summary: ''
    },
    admin: true,
    privateKeyDer,
    salt: Buffer.from(''),
    serverKey: Buffer.from(''),
    storedKey: Buffer.from('')
  }, signal, recover);

  expect(recover).not.toHaveBeenCalled();

  await expect(repository.insertLocalAccount({
    actor: {
      username: 'username',
      name: '',
      summary: ''
    },
    admin: true,
    privateKeyDer,
    salt: Buffer.from(''),
    serverKey: Buffer.from(''),
    storedKey: Buffer.from('')
  }, signal, error => {
    expect(error[conflict]).toBe(true);
    return recovery;
  })).rejects.toBe(recovery);
});
