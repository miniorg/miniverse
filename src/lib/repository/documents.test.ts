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

import { fabricateDirtyDocument, fabricateNote } from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import { conflict } from '.';

test('inserts and allows to query documents by id', async () => {
  const recover = jest.fn();
  const inserted = await repository.insertDocument(
    await repository.insertDirtyDocument(
      '00000000-0000-1000-8000-010000000000', 'png'),
    'https://إختبار/',
    recover);

  const queried = await repository.selectDocumentById(inserted.id);

  expect(recover).not.toHaveBeenCalled();
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', inserted.id);
  expect(queried).toHaveProperty('uuid', '00000000-0000-1000-8000-010000000000');
  expect(queried).toHaveProperty('format', 'png');
});

test('inserts document with URL and allows to query the URL', async () => {
  const recover = jest.fn();
  const inserted = await repository.insertDocument(
    await fabricateDirtyDocument(),
    'https://إختبار/',
    recover);

  expect(recover).not.toHaveBeenCalled();

  const [insertedUrl, queriedUrl] = await Promise.all([
    inserted.select('url'),
    repository.selectAllocatedURI('https://إختبار/')
  ]);

  expect(queriedUrl).toHaveProperty('id', unwrap(insertedUrl).id);
});

test('inserts and allows to query documents by attached note id', async () => {
  const recover = jest.fn();
  const inserted = await repository.insertDocument(
    await repository.insertDirtyDocument(
      '00000000-0000-1000-8000-010000000000', 'png'),
    'https://إختبار/',
    recover);

  const { id } = await fabricateNote({ attachments: [inserted] });
  const [queried] = await repository.selectDocumentsByAttachedNoteId(id);

  expect(recover).not.toHaveBeenCalled();
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', inserted.id);
  expect(queried).toHaveProperty('uuid', '00000000-0000-1000-8000-010000000000');
  expect(queried).toHaveProperty('format', 'png');
});

test('rejects when inserting document with conflicting URI', async () => {
  const recover = jest.fn();
  const recovery = {};

  await repository.insertDocument(
    await fabricateDirtyDocument(),
    'https://إختبار/',
    recover);

  expect(recover).not.toHaveBeenCalled();

  await expect(repository.insertDocument(
    await fabricateDirtyDocument(),
    'https://إختبار/',
    error => {
      expect(error[conflict]).toBe(true);
      return recovery;
    }
  )).rejects.toBe(recovery);
});
