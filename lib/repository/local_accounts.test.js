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

import Cookie from '../cookie';
import Follow from '../follow';
import LocalAccount from '../local_account';
import Note from '../note';
import Person from '../person';
import RemoteAccount from '../remote_account';
import repository from '../test_repository';

const privateKeyPem = `-----BEGIN RSA PRIVATE KEY-----
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
`;

test('delivers objects to inboxses', async () => {
  const account = new LocalAccount({
    admin: true,
    person: new Person({ username: '', host: null }),
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: ''
  });

  const note = new Note({ attributedTo: account.person, content: '' });

  await repository.insertLocalAccount(account);
  await repository.insertNote(note);

  let resolveMessage;
  const asyncMessage = new Promise(resolve => resolveMessage = resolve);
  await repository.subscribe(repository.getInboxChannel(account),
    (channel, message) => resolveMessage(JSON.parse(message)));

  await repository.insertIntoInboxes([account], note);

  await Promise.all([
    expect(asyncMessage).resolves.toHaveProperty('type', 'Note'),
    expect(asyncMessage).resolves.toHaveProperty('content', ''),
    repository.selectRecentNotesFromInbox(account).then(notes =>
      expect(notes[0]).toHaveProperty('id', note.id))
  ]);
});

test('inserts cookie and allows to query account with its digest', async () => {
  const digest = Buffer.from('digest');
  const cookie = new Cookie({
    account: new LocalAccount({
      admin: true,
      person: new Person({ username: 'username', host: null }),
      privateKeyPem,
      salt: Buffer.from('salt'),
      serverKey: Buffer.from('serverKey'),
      storedKey: Buffer.from('storedKey')
    }),
    digest
  });

  await repository.insertLocalAccount(cookie.account);
  await repository.insertCookie(cookie);

  const queried = await repository.selectLocalAccountByDigestOfCookie(digest);

  expect(queried).toHaveProperty('admin', true);
  expect(queried).toHaveProperty(['person', 'id'], cookie.account.person.id);
  expect(queried).toHaveProperty('privateKeyPem', privateKeyPem);
  expect(Buffer.from('salt').equals(queried.salt)).toBe(true);
  expect(Buffer.from('serverKey').equals(queried.serverKey)).toBe(true);
  expect(Buffer.from('storedKey').equals(queried.storedKey)).toBe(true);
});

test('inserts follow and allows to query account with its object', async () => {

  const follow = new Follow({
    actor: new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem,
        salt: Buffer.from('salt'),
        serverKey: Buffer.from('serverKey'),
        storedKey: Buffer.from('storedKey')
      }),
      username: '行動者',
      host: null
    }),
    object: new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '被行動者',
      host: null
    })
  });

  await Promise.all([
    repository.insertLocalAccount(follow.actor.account),
    repository.insertLocalAccount(follow.object.account)
  ]);

  await repository.insertFollow(follow);

  const [queried] =
    await repository.selectLocalAccountsByFollowee(follow.object);

  expect(queried).toHaveProperty('admin', true);
  expect(queried).toHaveProperty(['person', 'id'], follow.actor.id);
  expect(queried).toHaveProperty('privateKeyPem', privateKeyPem);
  expect(Buffer.from('salt').equals(queried.salt)).toBe(true);
  expect(Buffer.from('serverKey').equals(queried.serverKey)).toBe(true);
  expect(Buffer.from('storedKey').equals(queried.storedKey)).toBe(true);
});

test('inserts account and allows to query one by its person\'s username', async () => {
  const account = new LocalAccount({
    admin: true,
    person: new Person({ username: 'username', host: null }),
    privateKeyPem,
    salt: Buffer.from('salt'),
    serverKey: Buffer.from('serverKey'),
    storedKey: Buffer.from('storedKey')
  });

  await repository.insertLocalAccount(account);

  const queried = await repository.selectLocalAccountByUsername('username');

  expect(queried).toHaveProperty('admin', true);
  expect(queried).toHaveProperty(['person', 'id'], account.person.id);
  expect(queried).toHaveProperty(['person', 'username'], 'username');
  expect(queried).toHaveProperty(['person', 'host'], null);
  expect(queried).toHaveProperty('privateKeyPem', privateKeyPem);
  expect(Buffer.from('salt').equals(queried.salt)).toBe(true);
  expect(Buffer.from('serverKey').equals(queried.serverKey)).toBe(true);
  expect(Buffer.from('storedKey').equals(queried.storedKey)).toBe(true);
});

test('inserts account and allows to query one by its person', async () => {
  const account = new LocalAccount({
    admin: true,
    person: new Person({ username: 'username', host: null }),
    privateKeyPem,
    salt: Buffer.from('salt'),
    serverKey: Buffer.from('serverKey'),
    storedKey: Buffer.from('storedKey')
  });

  await repository.insertLocalAccount(account);

  const queried = await repository.selectLocalAccountByPerson(
    new Person({ id: account.person.id }));

  expect(queried).toHaveProperty('admin', true);
  expect(queried).toHaveProperty(['person', 'id'], account.person.id);
  expect(queried).toHaveProperty('privateKeyPem', privateKeyPem);
  expect(Buffer.from('salt').equals(queried.salt)).toBe(true);
  expect(Buffer.from('serverKey').equals(queried.serverKey)).toBe(true);
  expect(Buffer.from('storedKey').equals(queried.storedKey)).toBe(true);
});

test('inserts account allows to query one by its person with loaded account', async () => {
  const account = new LocalAccount({
    admin: true,
    person: new Person({ username: 'username', host: null }),
    privateKeyPem,
    salt: Buffer.from('salt'),
    serverKey: Buffer.from('serverKey'),
    storedKey: Buffer.from('storedKey')
  });

  await repository.insertLocalAccount(account);

  const queried = await repository.selectLocalAccountByPerson(account.person);

  expect(queried).toHaveProperty('admin', true);
  expect(queried).toHaveProperty(['person', 'id'], account.person.id);
  expect(queried).toHaveProperty('privateKeyPem', privateKeyPem);
  expect(Buffer.from('salt').equals(queried.salt)).toBe(true);
  expect(Buffer.from('serverKey').equals(queried.serverKey)).toBe(true);
  expect(Buffer.from('storedKey').equals(queried.storedKey)).toBe(true);
});

test('inserts account allows to query one by its person with unloaded account', async () => {
  const account = new LocalAccount({ 
    admin: true,
    person: new Person({ username: 'username', host: null }),
    privateKeyPem,
    salt: Buffer.from('salt'),
    serverKey: Buffer.from('serverKey'),
    storedKey: Buffer.from('storedKey')
  });

  await repository.insertLocalAccount(account);

  const queried = await repository.selectLocalAccountByPerson(
    new Person({ account: new LocalAccount, id: account.person.id }));

  expect(queried).toHaveProperty('admin', true);
  expect(queried).toHaveProperty(['person', 'id'], account.person.id);
  expect(queried).toHaveProperty('privateKeyPem', privateKeyPem);
  expect(Buffer.from('salt').equals(queried.salt)).toBe(true);
  expect(Buffer.from('serverKey').equals(queried.serverKey)).toBe(true);
  expect(Buffer.from('storedKey').equals(queried.storedKey)).toBe(true);
});

describe('selectLocalAccountByPerson', () =>
  test('returns null if remote account is loaded', async () => {
    const account = new RemoteAccount({
      person: new Person({
        username: '',
        host: 'FiNgEr.AcToR.إختبار'
      }),
      inbox: { uri: '' },
      publicKey: { uri: '', publicKeyPem: '' },
      uri: ''
    });

    await repository.insertRemoteAccount(account);

    await expect(repository.selectLocalAccountByPerson(account.person))
      .resolves
      .toBe(null);
  }));
