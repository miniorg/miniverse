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

import Follow from '../follow';
import LocalAccount from '../local_account';
import Mention from '../mention';
import Note from '../note';
import Person from '../person';
import RemoteAccount from '../remote_account';
import URI from '../uri';
import repository from '../test_repository';

describe('selectPersonById', () => {
  test('selects person by id', async () => {
    const inserted = new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'username',
      host: null
    });

    await repository.insertLocalAccount(inserted.account);

    const selected = await repository.selectPersonById(inserted.id);

    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', null);
  });

  test('selects person of local account by username and host', async () => {
    const inserted = new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'username',
      host: null
    });

    await repository.insertLocalAccount(inserted.account);

    const selected = await repository.selectPersonByUsernameAndNormalizedHost(
      'username', null);

    expect(selected).toHaveProperty('id', inserted.id);
    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', null);
  });

  test('selects person of remote account by username and host', async () => {
    const inserted = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: 'https://ReMoTe.إختبار/inbox' }),
        publicKeyURI: new URI({
          repository,
          uri: 'https://ReMoTe.إختبار/publickey'
        }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/' })
      }),
      username: 'username',
      host: 'FiNgEr.ReMoTe.xn--kgbechtv'
    });

    await repository.insertRemoteAccount(inserted.account);

    const selected = await repository.selectPersonByUsernameAndNormalizedHost(
      'username', 'finger.remote.xn--kgbechtv');

    expect(selected).toHaveProperty('id', inserted.id);
    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', 'FiNgEr.ReMoTe.xn--kgbechtv');
  });

  test('resolves with null if not found', () =>
    expect(repository.selectPersonById(0)).resolves.toBe(null));
});

test('inserts follow and allows to query person with local account with its object', async () => {
  const actor = new Person({
    account: new LocalAccount({
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username: '行動者',
    host: null
  });

  const object = new Person({
    account: new LocalAccount({
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username: '被行動者',
    host: null
  });

  await Promise.all([
    repository.insertLocalAccount(actor.account),
    repository.insertLocalAccount(object.account)
  ]);

  const follow = new Follow({ actor, object });
  await repository.insertFollow(follow);

  const [queried] =
    await repository.selectPersonsIncludingOuterRemoteAccountsByFollowee(
      object);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', actor.id);
  expect(queried).toHaveProperty('username', '行動者');
  expect(queried).toHaveProperty('host', null);
  await expect(queried.select('account')).resolves.toBeInstanceOf(LocalAccount);
});

test('inserts follow and allows to query person with remote account with its object', async () => {
  const actor = new Person({
    repository,
    account: new RemoteAccount({
      repository,
      inboxURI: new URI({ repository, uri: 'https://AcToR.إختبار/inbox' }),
      publicKeyURI: new URI({
        repository,
        uri: 'https://AcToR.إختبار/publickey'
      }),
      publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`,
      uri: new URI({ repository, uri: 'https://AcToR.إختبار/' })
    }),
    username: '行動者',
    host: 'FiNgEr.AcToR.xn--kgbechtv'
  });

  const object = new Person({
    account: new LocalAccount({
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username: '被行動者',
    host: null
  });

  await Promise.all([
    repository.insertRemoteAccount(actor.account),
    repository.insertLocalAccount(object.account)
  ]);

  const follow = new Follow({ actor, object });
  await repository.insertFollow(follow);

  const [queried] =
    await repository.selectPersonsIncludingOuterRemoteAccountsByFollowee(
      object);

  const queriedAccount = await queried.select('account');

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', actor.id);
  expect(queried).toHaveProperty('username', '行動者');
  expect(queried).toHaveProperty('host', 'FiNgEr.AcToR.xn--kgbechtv');
  expect(queriedAccount).toBeInstanceOf(RemoteAccount);
  expect(queriedAccount).toHaveProperty('repository', repository);
  expect(queriedAccount).toHaveProperty('id', actor.account.id);
  expect(queriedAccount).toHaveProperty('person', queried);
  expect(queriedAccount).toHaveProperty('inboxURIId', actor.account.inboxURIId);
  expect(queriedAccount).toHaveProperty('publicKeyURIId', actor.account.publicKeyURIId);
  expect(queriedAccount).toHaveProperty('publicKeyPem', `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`);
});

test('inserts note and allow to query persons with local account mentioned by the note', async () => {
  const attributedTo = new Person({
    account: new LocalAccount({
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username: 'AtTrIbUtEdTo',
    host: null
  });

  await repository.insertLocalAccount(attributedTo.account);

  const note = new Note({
    repository,
    attributedTo,
    content: '内容',
    mentions: [new Mention({ repository, href: attributedTo })]
  });

  await repository.insertNote(note);

  const [queried] = await repository.selectPersonsIncludingOuterRemoteAccountsOuterUrisMentionedByNoteId(note.id);
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', attributedTo.id);
  expect(queried).toHaveProperty('username', 'AtTrIbUtEdTo');
  expect(queried).toHaveProperty('host', null);
  await expect(queried.select('account')).resolves.toBeInstanceOf(LocalAccount);
});

test('inserts note and allow to query persons with remote account and uri mentioned by the note', async () => {
  const attributedTo = new Person({
    repository,
    account: new RemoteAccount({
      repository,
      inboxURI: new URI({
        repository,
        uri: 'https://AtTrIbUtEdTo.إختبار/inbox'
      }),
      publicKeyURI: new URI({
        repository,
        uri: 'https://AtTrIbUtEdTo.إختبار/publickey'
      }),
      publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`,
      uri: new URI({ repository, uri: 'https://AtTrIbUtEdTo.إختبار/' })
    }),
    username: 'AtTrIbUtEdTo',
    host: 'FiNgEr.AtTrIbUtEdTo.xn--kgbechtv'
  });

  await repository.insertRemoteAccount(attributedTo.account);

  const note = new Note({
    repository,
    attributedTo,
    content: '内容',
    mentions: [new Mention({ repository, href: attributedTo })]
  });

  await repository.insertNote(note);

  const [queried] = await repository.selectPersonsIncludingOuterRemoteAccountsOuterUrisMentionedByNoteId(note.id);
  const queriedAccount = await queried.select('account');
  const queriedURI = await queriedAccount.select('uri');

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', attributedTo.id);
  expect(queried).toHaveProperty('username', 'AtTrIbUtEdTo');
  expect(queried).toHaveProperty('host', 'FiNgEr.AtTrIbUtEdTo.xn--kgbechtv');
  expect(queriedAccount).toBeInstanceOf(RemoteAccount);
  expect(queriedAccount).toHaveProperty('repository', repository);
  expect(queriedAccount).toHaveProperty('id', attributedTo.account.id);
  expect(queriedAccount).toHaveProperty('person', queried);
  expect(queriedAccount).toHaveProperty('inboxURIId', attributedTo.account.inboxURIId);
  expect(queriedAccount).toHaveProperty('publicKeyURIId', attributedTo.account.publicKeyURIId);
  expect(queriedAccount).toHaveProperty('publicKeyPem', `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`);
  expect(queriedURI).toHaveProperty('id', attributedTo.account.uri.id);
  expect(queriedURI).toHaveProperty('uri', attributedTo.account.uri.uri);
});
