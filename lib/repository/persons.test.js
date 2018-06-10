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

test('inserts follow and allows to query person by its object', async () => {
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

  const [queried] = await repository.selectPersonsByFolloweeId(object.id);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', actor.id);
  expect(queried).toHaveProperty('username', '行動者');
  expect(queried).toHaveProperty('host', null);
});

test('inserts note and allow to query persons mentioned by the note', async () => {
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

  const [queried] = await repository.selectPersonsMentionedByNoteId(note.id);
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', attributedTo.id);
  expect(queried).toHaveProperty('username', 'AtTrIbUtEdTo');
  expect(queried).toHaveProperty('host', null);
});
