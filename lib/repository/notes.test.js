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
import Status from '../status';
import {
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';

test('inserts and deletes note and prevent from querying its properties', async () => {
  const { status } = await fabricateNote(
   { status: { uri: { uri: 'https://ReMoTe.إختبار/' } } });

  const uri = await repository.selectURI('https://ReMoTe.إختبار/');
  await repository.deleteStatusByUriAndAttributedTo(uri, status.person);

  await expect(repository.selectRecentStatusesIncludingExtensionsByPersonId(status.personId))
    .resolves
    .toEqual([]);
});

test('inserts note and allows to query by its id', async () => {
  const note = await fabricateNote({ summary: null, content: '内容' });

  const queried = await repository.selectNoteById(note.id);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.id);
  expect(queried).toHaveProperty('summary', null);
  expect(queried).toHaveProperty('content', '内容');
});

test('inserts note with URI and allows to query it', async () => {
  const note =
    await fabricateNote({ status: { uri: { uri: 'https://ReMoTe.إختبار/' } } });

  await expect(repository.selectURIById(note.id))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});

test('inserts note without URI', async () => {
  const note = await fabricateNote({ status: { uri: null } });
  await expect(repository.selectURIById(note.id)).resolves.toBe(null);
});

test('inserts note with inReplyToId', async () => {
  const { status } = await fabricateNote();
  const note = await fabricateNote({ inReplyToId: status.id });

  await expect(repository.selectNoteById(note.id))
    .resolves
    .toHaveProperty('inReplyToId', status.id);
});

test('inserts note with inReplyTo URI which is already resolved', async () => {
  const [{ person }, { status }] = await Promise.all([
    fabricateLocalAccount(),
    fabricateNote({ status: { uri: { uri: 'https://ReMoTe.إختبار/' } } })
  ]);

  const note = new Note({
    repository,
    status: new Status({ repository, person }),
    content: '',
    mentions: []
  });

  await repository.insertNote(note, 'https://ReMoTe.إختبار/');
  expect(note).toHaveProperty('inReplyToId', status.id);

  await expect(repository.selectNoteById(note.id))
    .resolves
    .toHaveProperty('inReplyToId', status.id);
});

test('inserts notes with inReplyTo URI which is not resolved yet', async () => {
  const { person } = await fabricateLocalAccount();

  for (let count = 0; count < 2; count++) {
    const note = new Note({
      repository,
      status: new Status({ repository, person }),
      content: '',
      mentions: []
    });

    await repository.insertNote(note, 'https://ReMoTe.إختبار/');

    await Promise.all([
      expect(repository.selectStatusById(note.inReplyToId))
        .resolves
        .toHaveProperty('personId', null),
      expect(repository.selectURIById(note.inReplyToId))
        .resolves
        .toHaveProperty('uri', 'https://ReMoTe.إختبار/')
    ]);
  }
});

test('inserts notes with inReplyTo URI and allows to resolve later', async () => {
  const [note, person] = await Promise.all([
    fabricateLocalAccount().then(async ({ person }) => {
      const note = new Note({
        repository,
        status: new Status({ repository, person }),
        content: '内容',
        mentions: []
      });

      await repository.insertNote(note, 'https://ReMoTe.إختبار/');

      await Promise.all([
        expect(repository.selectStatusById(note.inReplyToId))
          .resolves
          .toHaveProperty('personId', null),
        expect(repository.selectURIById(note.inReplyToId))
          .resolves
          .toHaveProperty('uri', 'https://ReMoTe.إختبار/')
      ]);

      return note;
    }),
    fabricateRemoteAccount()
  ]);

  const inReplyTo = new Note({
    repository,
    status: new Status({ 
      repository,
      person,
      uri: { uri: 'https://ReMoTe.إختبار/' }
    }),
    content: '',
    mentions: []
  });

  await repository.insertNote(inReplyTo);
  expect(inReplyTo).toHaveProperty('id', note.inReplyToId);

  await expect(repository.selectNoteById(note.inReplyToId))
    .resolves
    .toHaveProperty('content', '');

  await expect(repository.selectStatusById(note.inReplyToId))
    .resolves
    .toHaveProperty('personId', person.id);
});
