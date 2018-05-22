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
import Note from '../note';
import Person from '../person';
import repository from '../test_repository';

test('inserts note and allows to query by the username and host of person attributed to', async () => {
  const note = new Note({
    uri: 'https://ReMoTe.إختبار/',
    attributedTo: new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '',
      host: null
    }),
    content: '内容'
  });

  await repository.insertLocalAccount(note.attributedTo.account);
  await repository.insertNote(note);

  const [queried] =
    await repository.selectRecentNotesByUsernameAndNormalizedHost('', null);

  expect(queried).toHaveProperty('id', note.id);
  expect(queried).toHaveProperty('uri', 'https://ReMoTe.إختبار/');
  expect(queried).toHaveProperty(
    ['attributedTo', 'repositoy'], note.attributedTo.repository);
  expect(queried).toHaveProperty(['attributedTo', 'id'], note.attributedTo.id);
  expect(queried).toHaveProperty('content', '内容');
});

test('inserts note and allows to put one into inbox and query with it', async () => {
  const note = new Note({
    uri: 'https://ReMoTe.إختبار/',
    attributedTo: new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '',
      host: null
    }),
    content: '内容'
  });

  await repository.insertLocalAccount(note.attributedTo.account);
  await repository.insertNote(note);

  await repository.insertIntoInboxes([note.attributedTo.account], note);

  const [queried] = await repository.selectRecentNotesFromInbox(
    note.attributedTo.account);

  expect(queried).toHaveProperty('id', note.id);
  expect(queried).toHaveProperty('uri', 'https://ReMoTe.إختبار/');
  expect(queried).toHaveProperty(
    ['attributedTo', 'repositoy'], note.attributedTo.repository);
  expect(queried).toHaveProperty(['attributedTo', 'id'], note.attributedTo.id);
  expect(queried).toHaveProperty('content', '内容');
});
