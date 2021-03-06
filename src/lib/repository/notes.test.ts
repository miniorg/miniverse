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
import {
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import { conflict } from '.';

const { signal } = new AbortController;

test('inserts and deletes note and prevent from querying its properties', async () => {
  const recover = jest.fn();

  const note = await fabricateNote(
    { status: { uri: 'https://ReMoTe.إختبار/' } });

  const [actor, uri] = await Promise.all([
    note.select('status', signal, recover)
      .then(status => unwrap(status).select('actor', signal, recover))
      .then(unwrap),
    repository.selectAllocatedURI('https://ReMoTe.إختبار/', signal, recover)
      .then(unwrap)
  ]);

  await repository.deleteStatusByUriAndAttributedTo(uri, actor, signal, recover);

  await expect(repository.selectRecentStatusesIncludingExtensionsByActorId(
    actor.id,
    signal,
    recover
  )).resolves.toEqual([]);

  expect(recover).not.toHaveBeenCalled();
});

test('inserts note and allows to query by its id', async () => {
  const recover = jest.fn();
  const note = await fabricateNote({ summary: null, content: '内容' });

  const queried = await repository.selectNoteById(note.id, signal, recover);

  expect(recover).not.toHaveBeenCalled();
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.id);
  expect(queried).toHaveProperty('summary', null);
  expect(queried).toHaveProperty('content', '内容');
});

test('inserts note with URI and allows to query it', async () => {
  const recover = jest.fn();

  const note =
    await fabricateNote({ status: { uri: 'https://ReMoTe.إختبار/' } });

  await expect(repository.selectURIById(note.id, signal, recover))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});

test('rejects when inserting note with conflicting URI', async () => {
  const recover = jest.fn();
  const account = await fabricateRemoteAccount();
  const actor = unwrap(await account.select('actor', signal, recover));
  const recovery = {};

  await repository.insertNote({
    status: {
      published: new Date,
      actor,
      uri: 'https://ReMoTe.إختبار/'
    },
    summary: null,
    content: '',
    inReplyTo: { id: null, uri: null },
    attachments: [],
    hashtags: [],
    mentions: []
  }, signal, recover);

  expect(recover).not.toHaveBeenCalled();

  await expect(repository.insertNote({
    status: {
      published: new Date,
      actor,
      uri: 'https://ReMoTe.إختبار/'
    },
    summary: null,
    content: '',
    inReplyTo: { id: null, uri: null },
    attachments: [],
    hashtags: [],
    mentions: []
  }, signal, error => {
    expect(error[conflict]).toBe(true);
    return recovery;
  })).rejects.toBe(recovery);
});

test('inserts note without URI', async () => {
  const recover = jest.fn();
  const note = await fabricateNote({ status: { uri: null } });
  await expect(repository.selectURIById(note.id, signal, recover))
    .resolves.toBe(null);
  expect(recover).not.toHaveBeenCalled();
});

test('inserts note with inReplyToId', async () => {
  const recover = jest.fn();
  const inReplyTo = await fabricateNote();
  const status = unwrap(await inReplyTo.select('status', signal, recover));
  const note = await fabricateNote({ inReplyTo: { id: status.id, uri: null } });

  await expect(repository.selectNoteById(note.id, signal, recover))
    .resolves
    .toHaveProperty('inReplyToId', status.id);
});

test('inserts note with inReplyTo URI which is already resolved', async () => {
  const recover = jest.fn();

  const [actor, status] = await Promise.all([
    fabricateLocalAccount()
      .then(account => account.select('actor', signal, recover))
      .then(unwrap),
    fabricateNote({ status: { uri: 'https://ReMoTe.إختبار/' } })
      .then(note => note.select('status', signal, recover))
      .then(unwrap)
  ]);

  const note = await repository.insertNote({
    status: { published: new Date, actor, uri: null },
    summary: null,
    content: '',
    inReplyTo: { id: null, uri: 'https://ReMoTe.إختبار/' },
    attachments: [],
    hashtags: [],
    mentions: []
  }, signal, recover);

  expect(recover).not.toHaveBeenCalled();
  expect(note).toHaveProperty('inReplyToId', status.id);

  await expect(repository.selectNoteById(note.id, signal, recover))
    .resolves
    .toHaveProperty('inReplyToId', status.id);
});

test('inserts notes with inReplyTo URI which is not resolved yet', async () => {
  const recover = jest.fn();
  const account = await fabricateLocalAccount();
  const actor = unwrap(await account.select('actor', signal, recover));

  for (let count = 0; count < 2; count++) {
    const note = await repository.insertNote({
      status: { published: new Date, actor, uri: null },
      summary: null,
      content: '',
      inReplyTo: { id: null, uri: 'https://ReMoTe.إختبار/' },
      attachments: [],
      hashtags: [],
      mentions: []
    }, signal, recover);

    await expect(repository.selectURIById(
      unwrap(note.inReplyToId),
      signal,
      recover
    )).resolves.toHaveProperty('uri', 'https://ReMoTe.إختبار/');
  }

  expect(recover).not.toHaveBeenCalled();
});

test('inserts notes with inReplyTo URI and allows to resolve later', async () => {
  const recover = jest.fn();

  const [note, actor] = await Promise.all([
    fabricateLocalAccount().then(async account => {
      const note = await repository.insertNote({
        status: {
          published: new Date,
          actor: unwrap(await account.select('actor', signal, recover)),
          uri: null
        },
        summary: null,
        content: '内容',
        inReplyTo: { id: null, uri: 'https://ReMoTe.إختبار/' },
        attachments: [],
        hashtags: [],
        mentions: []
      }, signal, recover);

      await expect(repository.selectURIById(
        unwrap(note.inReplyToId),
        signal,
        recover
      )).resolves.toHaveProperty('uri', 'https://ReMoTe.إختبار/');

      return note;
    }),
    fabricateRemoteAccount()
      .then(account => account.select('actor', signal, recover))
      .then(unwrap)
  ]);

  const inReplyTo = await repository.insertNote({
    status: {
      published: new Date,
      actor,
      uri: 'https://ReMoTe.إختبار/'
    },
    summary: null,
    content: '',
    inReplyTo: { id: null, uri: null },
    attachments: [],
    hashtags: [],
    mentions: []
  }, signal, recover);

  expect(inReplyTo).toHaveProperty('id', note.inReplyToId);

  await expect(repository.selectNoteById(
    unwrap(note.inReplyToId),
    signal,
    recover
  )).resolves.toHaveProperty('content', '');

  await expect(repository.selectStatusById(
    unwrap(note.inReplyToId),
    signal,
    recover
  )).resolves.toHaveProperty('actorId', actor.id);

  expect(recover).not.toHaveBeenCalled();
});

test('inserts notes with a hashtag', async () => {
  for (let count = 0; count < 2; count++) {
    const recover = jest.fn();
    const { id } = await fabricateNote({ hashtags: ['名前'] });
    const hashtags =
      await repository.selectHashtagsByNoteId(id, signal, recover);
    expect(recover).not.toHaveBeenCalled();
    await expect(hashtags[0]).toHaveProperty('name', '名前');
  }
});
