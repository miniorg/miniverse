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
import URI from '../uri';
import {
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';

test('inserts and deletes note and prevent from querying its properties', async () => {
  const note = await fabricateNote(
   { status: { uri: { uri: 'https://ReMoTe.إختبار/' } } });

  const [actor, uri] = await Promise.all([
    note.select('status')
        .then(status => unwrap(status).select('actor'))
        .then(unwrap),
    repository.selectAllocatedURI('https://ReMoTe.إختبار/').then(unwrap)
  ]);

  await repository.deleteStatusByUriAndAttributedTo(uri, actor);

  await expect(repository.selectRecentStatusesIncludingExtensionsByActorId(unwrap(actor.id)))
    .resolves
    .toEqual([]);
});

test('inserts note and allows to query by its id', async () => {
  const note = await fabricateNote({ summary: null, content: '内容' });

  const queried = await repository.selectNoteById(unwrap(note.id));

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.id);
  expect(queried).toHaveProperty('summary', null);
  expect(queried).toHaveProperty('content', '内容');
});

test('inserts note with URI and allows to query it', async () => {
  const note =
    await fabricateNote({ status: { uri: { uri: 'https://ReMoTe.إختبار/' } } });

  await expect(repository.selectURIById(unwrap(note.id)))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});

test('inserts note without URI', async () => {
  const note = await fabricateNote({ status: { uri: null } });
  await expect(repository.selectURIById(unwrap(note.id))).resolves.toBe(null);
});

test('inserts note with inReplyToId', async () => {
  const inReplyTo = await fabricateNote();
  const status = unwrap(await inReplyTo.select('status'));
  const note = await fabricateNote({ inReplyToId: status.id });

  await expect(repository.selectNoteById(unwrap(note.id)))
    .resolves
    .toHaveProperty('inReplyToId', unwrap(status.id));
});

test('inserts note with inReplyTo URI which is already resolved', async () => {
  const [actor, status] = await Promise.all([
    fabricateLocalAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateNote({ status: { uri: { uri: 'https://ReMoTe.إختبار/' } } })
      .then(note => note.select('status'))
      .then(unwrap)
  ]);

  const note = new Note({
    repository,
    status: new Status({ repository, published: new Date, actor }),
    summary: null,
    content: '',
    hashtags: [],
    mentions: []
  });

  await repository.insertNote(note, 'https://ReMoTe.إختبار/');
  expect(note).toHaveProperty('inReplyToId', status.id);

  await expect(repository.selectNoteById(unwrap(note.id)))
    .resolves
    .toHaveProperty('inReplyToId', status.id);
});

test('inserts notes with inReplyTo URI which is not resolved yet', async () => {
  const account = await fabricateLocalAccount();
  const actor = unwrap(await account.select('actor'));

  for (let count = 0; count < 2; count++) {
    const note = new Note({
      repository,
      status: new Status({ repository, published: new Date, actor }),
      summary: null,
      content: '',
      hashtags: [],
      mentions: []
    });

    await repository.insertNote(note, 'https://ReMoTe.إختبار/');

    await Promise.all([
      expect(repository.selectURIById(note.inReplyToId))
        .resolves
        .toHaveProperty('uri', 'https://ReMoTe.إختبار/')
    ]);
  }
});

test('inserts notes with inReplyTo URI and allows to resolve later', async () => {
  const [note, actor] = await Promise.all([
    fabricateLocalAccount().then(async account => {
      const note = new Note({
        repository,
        status: new Status({
          repository,
          published: new Date,
          actor: unwrap(await account.select('actor'))
        }),
        summary: null,
        content: '内容',
        hashtags: [],
        mentions: []
      });

      await repository.insertNote(note, 'https://ReMoTe.إختبار/');

      await expect(repository.selectURIById(note.inReplyToId))
        .resolves
        .toHaveProperty('uri', 'https://ReMoTe.إختبار/');

      return note;
    }),
    fabricateRemoteAccount()
      .then(account => account.select('actor'))
      .then(unwrap)
  ]);

  const inReplyTo = new Note({
    repository,
    status: new Status({
      repository,
      published: new Date,
      actor,
      uri: new URI({
        repository,
        uri: 'https://ReMoTe.إختبار/',
        allocated: true
      })
    }),
    summary: null,
    content: '',
    hashtags: [],
    mentions: []
  });

  await repository.insertNote(inReplyTo);
  expect(inReplyTo).toHaveProperty('id', note.inReplyToId);

  await expect(repository.selectNoteById(note.inReplyToId))
    .resolves
    .toHaveProperty('content', '');

  await expect(repository.selectStatusById(note.inReplyToId))
    .resolves
    .toHaveProperty('actorId', actor.id);
});

test('inserts notes with a hashtag', async () => {
  for (let count = 0; count < 2; count++) {
    const { id } = await fabricateNote({ hashtags: [{ name: '名前' }] });
    const hashtags = await repository.selectHashtagsByNoteId(unwrap(id));
    await expect(hashtags[0]).toHaveProperty('name', '名前');
  }
});
