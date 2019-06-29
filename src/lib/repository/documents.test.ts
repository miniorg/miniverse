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
import { fabricateDirtyDocument, fabricateNote } from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import { conflict } from '.';

const { signal } = new AbortController;

test('inserts document with URL and allows to query it by id or UUID', async () => {
  const recover = jest.fn();
  const { id } = await repository.insertDocumentWithUrl(
    await repository.insertDirtyDocument(
      '00000000-0000-1000-8000-010000000000', 'png', signal, recover),
    'https://إختبار/',
    signal,
    recover);

  for (const queried of await Promise.all([
    repository.selectDocumentById(id, signal, recover),
    repository.selectDocumentByUUID(
      '00000000-0000-1000-8000-010000000000', signal, recover)
  ])) {
    expect(queried).toHaveProperty('repository', repository);
    expect(queried).toHaveProperty('id', id);
    expect(queried).toHaveProperty('uuid', '00000000-0000-1000-8000-010000000000');
    expect(queried).toHaveProperty('format', 'png');
  }

  expect(recover).not.toHaveBeenCalled();
});

test('inserts document without URL and allows to query it by id or UUID', async () => {
  const recover = jest.fn();
  const { id } = await repository.insertDocumentWithoutUrl(
    await repository.insertDirtyDocument(
      '00000000-0000-1000-8000-010000000000', 'png', signal, recover),
    signal,
    recover);

  for (const queried of await Promise.all([
    repository.selectDocumentById(id, signal, recover),
    repository.selectDocumentByUUID(
      '00000000-0000-1000-8000-010000000000', signal, recover)
  ])) {
    expect(queried).toHaveProperty('repository', repository);
    expect(queried).toHaveProperty('id', id);
    expect(queried).toHaveProperty('uuid', '00000000-0000-1000-8000-010000000000');
    expect(queried).toHaveProperty('format', 'png');
  }

  expect(recover).not.toHaveBeenCalled();
});

test('inserts document with URL and allows to query the URL', async () => {
  const recover = jest.fn();
  const inserted = await repository.insertDocumentWithUrl(
    await fabricateDirtyDocument(),
    'https://إختبار/',
    signal,
    recover);

  expect(recover).not.toHaveBeenCalled();

  const [insertedUrl, queriedUrl] = await Promise.all([
    inserted.select('url', signal, recover),
    repository.selectAllocatedURI('https://إختبار/', signal, recover)
  ]);

  expect(queriedUrl).toHaveProperty('id', unwrap(insertedUrl).id);
});

test('inserts and allows to query documents by attached note id', async () => {
  const recover = jest.fn();
  const inserted = await repository.insertDocumentWithoutUrl(
    await repository.insertDirtyDocument(
      '00000000-0000-1000-8000-010000000000', 'png', signal, recover),
    signal,
    recover);

  const { id } = await fabricateNote({ attachments: [inserted] });
  const [queried] =
    await repository.selectDocumentsByAttachedNoteId(id, signal, recover);

  expect(recover).not.toHaveBeenCalled();
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', inserted.id);
  expect(queried).toHaveProperty('uuid', '00000000-0000-1000-8000-010000000000');
  expect(queried).toHaveProperty('format', 'png');
});

test('rejects when inserting document with conflicting URI', async () => {
  const recover = jest.fn();
  const recovery = {};

  await repository.insertDocumentWithUrl(
    await fabricateDirtyDocument(),
    'https://إختبار/',
    signal,
    recover);

  expect(recover).not.toHaveBeenCalled();

  await expect(repository.insertDocumentWithUrl(
    await fabricateDirtyDocument(),
    'https://إختبار/',
    signal,
    error => {
      expect(error[conflict]).toBe(true);
      return recovery;
    }
  )).rejects.toBe(recovery);
});
