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
  fabricateAnnounce,
  fabricateDocument,
  fabricateLocalAccount,
  fabricateNote
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';

const  { signal } = new AbortController;

describe('deleteStatus', () => {
  test('does not delete status if given attributedTo does not match', async () => {
    const recover = jest.fn();
    const [[id, uri], actor] = await Promise.all([
      fabricateNote({ status: { uri: 'https://note.إختبار' } })
        .then(note => note.select('status', signal, recover))
        .then(unwrap)
        .then(status => Promise.all([
          status.id,
          status.select('uri', signal, recover)
        ])),
      fabricateLocalAccount()
        .then(account => account.select('actor', signal, recover))
    ]);

    await repository.deleteStatusByUriAndAttributedTo(
      unwrap(uri), unwrap(actor), signal, recover);

    await expect(repository.selectStatusById(id, signal, recover))
      .resolves.not.toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });

  test('deletes announces', async () => {
    const recover = jest.fn();
    const object = await fabricateNote(
      { status: { uri: 'https://note.إختبار' } });
    const [announceStatusId, [uri, actor]] = await Promise.all([
      fabricateAnnounce({ object })
        .then(announce => announce.select('status', signal, recover))
        .then(status => unwrap(status).id),
      object.select('status', signal, recover)
        .then(unwrap)
        .then(status => Promise.all([
          status.select('uri', signal, recover),
          status.select('actor', signal, recover)
        ]))
    ]);

    await repository.deleteStatusByUriAndAttributedTo(
      unwrap(uri), unwrap(actor), signal, recover);

    await expect(repository.selectStatusById(announceStatusId, signal, recover))
      .resolves.toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });

  test('does not unlink attached documents if they are still referenced by something else', async () => {
    const recover = jest.fn();
    const document = await fabricateDocument();
    const notes = await Promise.all([
      fabricateNote({
        attachments: [document],
        status: { uri: 'https://note.إختبار' }
      }),
      fabricateNote({ attachments: [document] })
    ]);
    const status = unwrap(await notes[0].select('status', signal, recover));
    const [uri, actor] = (await Promise.all([
      status.select('uri', signal, recover),
      status.select('actor', signal, recover)
    ]));

    await repository.deleteStatusByUriAndAttributedTo(
      unwrap(uri), unwrap(actor), signal, recover);

    await expect(repository.selectDocumentById(document.id, signal, recover))
      .resolves.not.toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });

  test('unlinks attached documents', async () => {
    const recover = jest.fn();
    const document = await fabricateDocument(
      await repository.insertDirtyDocument(
        '00000000-0000-1000-8000-010000000000', 'png', signal, recover));
    const note = await fabricateNote({
      attachments: [document],
      status: { uri: 'https://note.إختبار' }
    });
    const status = unwrap(await note.select('status', signal, recover));
    const [uri, actor] = await Promise.all([
      status.select('uri', signal, recover),
      status.select('actor', signal, recover)
    ]);

    await repository.deleteStatusByUriAndAttributedTo(
      unwrap(uri), unwrap(actor), signal, recover);

    await expect(repository.selectDocumentById(document.id, signal, recover))
      .resolves.toBe(null);

    const unlinkeds = await repository.selectUnlinkedDocuments(signal, recover);
    expect(unlinkeds[0]).toHaveProperty('uuid', '00000000-0000-1000-8000-010000000000');
    expect(unlinkeds[0]).toHaveProperty('format', 'png');
  });
});

test('inserts note and allows to query its status by the id of actor attributed to', async () => {
  const recover = jest.fn();
  const note = await fabricateNote();
  const { id, published, actorId } = unwrap(await note.select('status', signal, recover));

  const [queried] =
    await repository.selectRecentStatusesIncludingExtensionsByActorId(actorId, signal, recover);

  expect(recover).not.toHaveBeenCalled();
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', id);
  expect(queried).toHaveProperty('published', published);
  expect(queried).toHaveProperty('actorId', actorId);
});

test('inverts note and allows to query its status along with it by the id of actor attributed to', async () => {
  const recover = jest.fn();
  const note = await fabricateNote();
  const { id, actorId, published } = unwrap(await note.select('status', signal, recover));

  const [queried] = await repository.selectRecentStatusesIncludingExtensionsByActorId(actorId, signal, recover);

  expect(recover).not.toHaveBeenCalled();
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', id);
  expect(queried).toHaveProperty('published', published);
  expect(queried).toHaveProperty('actorId', actorId);
  expect(queried).toHaveProperty(['extension', 'repository'], repository);
  expect(queried).toHaveProperty(['extension', 'id'], note.id);
  expect(queried).toHaveProperty(['extension', 'content'], note.content);
});

test('inserts note and allows to put its status into inbox and query it', async () => {
  const recover = jest.fn();
  const note = await fabricateNote();
  const status = unwrap(await note.select('status', signal, recover));
  const actor = unwrap(await status.select('actor', signal, recover));

  await repository.insertIntoInboxes([actor], status, signal, recover);

  const [queried] =
    await repository.selectRecentStatusesIncludingExtensionsAndActorsFromInbox(
      actor.id, signal, recover);

  expect(recover).not.toHaveBeenCalled();
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('published', status.published);
  expect(queried).toHaveProperty('id', status.id);
  expect(queried).toHaveProperty('actorId', status.actorId);
});
