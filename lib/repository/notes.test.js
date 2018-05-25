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

import LocalPerson from '../local_person';
import Note from '../note';
import repository from '../test_repository';

test('inserts note and allows to query its properties', async () => {
  const attributedTo = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: '',
    host: null
  });

  await repository.insertLocalPerson(attributedTo);

  const note = new Note(repository, null, {
    uri: 'https://ReMoTe.إختبار/',
    attributedTo,
    content: '内容'
  });

  await repository.insertNote(note);

  const queriedProperties = await repository.loadNote(note);

  expect(queriedProperties).toHaveProperty('uri', 'https://ReMoTe.إختبار/');
  expect(queriedProperties.attributedTo.repository)
    .toBe(attributedTo.repository);
  expect(queriedProperties)
    .toHaveProperty(['attributedTo', 'id'], attributedTo.id);
  expect(queriedProperties).toHaveProperty('content', '内容');
});

test('inserts note and allows to query by the username and host of person attributed to', async () => {
  const attributedTo = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: '',
    host: null
  });

  await repository.insertLocalPerson(attributedTo);

  const note = new Note(repository, null, {
    uri: 'https://ReMoTe.إختبار/',
    attributedTo,
    content: '内容'
  });

  await repository.insertNote(note);

  const [queried] =
    await repository.selectRecentNotesByUsernameAndNormalizedHost('', null);
  const queriedProperties = await queried.get();

  expect(queried).toHaveProperty('id', note.id);
  expect(queriedProperties).toHaveProperty('uri', 'https://ReMoTe.إختبار/');
  expect(queriedProperties.attributedTo.repository)
    .toBe(attributedTo.repository);
  expect(queriedProperties)
    .toHaveProperty(['attributedTo', 'id'], attributedTo.id);
  expect(queriedProperties).toHaveProperty('content', '内容');
});

test('inserts note and allows to put one into inbox and query with it', async () => {
  const attributedTo = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: '',
    host: null
  });

  await repository.insertLocalPerson(attributedTo);

  const note = new Note(repository, null, {
    uri: 'https://ReMoTe.إختبار/',
    attributedTo,
    content: '内容'
  });

  await repository.insertNote(note);
  await repository.insertIntoInboxes([attributedTo], note);

  const [queried] = await repository.selectRecentNotesFromInbox(attributedTo);
  const queriedProperties = await queried.get();

  expect(queried).toHaveProperty('id', note.id);
  expect(queriedProperties).toHaveProperty('uri', 'https://ReMoTe.إختبار/');
  expect(queriedProperties.attributedTo.repository)
    .toBe(attributedTo.repository);
  expect(queriedProperties)
    .toHaveProperty(['attributedTo', 'id'], attributedTo.id);
  expect(queriedProperties).toHaveProperty('content', '内容');
});
