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

import LocalAccount from '../local_account';
import RemoteAccount from '../remote_account';
import Note from '../note';
import Person from '../person';
import repository from '../test_repository';
import URI from '../uri';

describe('deleteNoteByUriAndAttributedTo', () =>
  test('rejects if not found', async () => {
    const attributedTo = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inbox: { uri: new URI({ repository, uri: '' }) },
        publicKey: { uri: new URI({ repository, uri: '' }), publicKeyPem: '' },
        uri: new URI({
          repository,
          uri: 'https://ReMoTe.إختبار/attributed_to'
        })
      }),
      username: '',
      host: 'FiNgEr.ReMoTe.إختبار'
    });

    const someoneElse = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inbox: {
          uri: new URI({
            repository,
            uri: 'https://ReMoTe.إختبار/someone_else/inbox'
          })
        },
        publicKey: {
          uri: new URI({
            repository,
            uri: 'https://ReMoTe.إختبار/someone_else/key'
          }),
          publicKeyPem: ''
        },
        uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/someone_else' })
      }),
      username: 'someone else',
      host: 'FiNgEr.ReMoTe.إختبار'
    });

    await Promise.all([
      repository.insertRemoteAccount(attributedTo.account).then(async () => {
        const note = new Note({ repository, attributedTo, content: '内容' });
        await repository.insertNote(note, 'https://ReMoTe.إختبار/');
      }),
      repository.insertRemoteAccount(someoneElse.account)
    ]);

    const uri = await repository.selectURI('https://ReMoTe.إختبار/');

    await expect(repository.deleteNoteByUriAndAttributedTo(uri, someoneElse))
      .rejects
      .toBeInstanceOf(Error);
  }));

test('inserts and deletes note and prevent from querying its properties', async () => {
  const attributedTo = new Person({
    repository,
    account: new RemoteAccount({
      repository,
      inbox: { uri: new URI({ repository, uri: '' }) },
      publicKey: { uri: new URI({ repository, uri: '' }), publicKeyPem: '' },
      uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/attributed_to' })
    }),
    username: '',
    host: 'FiNgEr.ReMoTe.إختبار'
  });

  await repository.insertRemoteAccount(attributedTo.account);

  const note = new Note({ repository, attributedTo, content: '内容' });
  await repository.insertNote(note, 'https://ReMoTe.إختبار/');

  const uri = await repository.selectURI('https://ReMoTe.إختبار/');
  await repository.deleteNoteByUriAndAttributedTo(uri, attributedTo);

  await expect(repository.selectRecentNotesByUsernameAndNormalizedHost('', 'FiNgEr.ReMoTe.إختبار'))
    .resolves
    .toEqual([]);
});

test('inserts note and allows to query by the username and host of person attributed to', async () => {
  const attributedTo = new Person({
    account: new LocalAccount({
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username: '',
    host: null
  });

  await repository.insertLocalAccount(attributedTo.account);

  const note = new Note({ repository, attributedTo, content: '内容' });
  await repository.insertNote(note);

  const [queried] =
    await repository.selectRecentNotesByUsernameAndNormalizedHost('', null);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.id);
  expect(queried).toHaveProperty('attributedToId', note.attributedToId);
  expect(queried).toHaveProperty('content', '内容');
});

test('inserts note and allows to put one into inbox and query with it', async () => {
  const attributedTo = new Person({
    account: new LocalAccount({
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username: '',
    host: null
  });

  await repository.insertLocalAccount(attributedTo.account);

  const note = new Note({ repository, attributedTo, content: '内容' });
  await repository.insertNote(note);

  await repository.insertIntoInboxes([attributedTo.account], note);

  const [queried] = await repository.selectRecentNotesFromInbox(
    attributedTo.account);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.id);
  expect(queried).toHaveProperty('attributedToId', note.attributedToId);
  expect(queried).toHaveProperty('content', '内容');
});
