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

import { fabricateNote } from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Document from '../tuples/document';
import URI from '../tuples/uri';

test('inserts and allows to query documents by id', async () => {
  const inserted = new Document({
    repository,
    uuid: '00000000-0000-1000-8000-010000000000',
    format: 'png',
    url: new URI({ repository, uri: 'https://إختبار/', allocated: true })
  });
  await repository.insertDocument(inserted);

  const queried = await repository.selectDocumentById(unwrap(inserted.id));

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', inserted.id);
  expect(queried).toHaveProperty('uuid', '00000000-0000-1000-8000-010000000000');
  expect(queried).toHaveProperty('format', 'png');
});

test('inserts document with URL and allows to query the URL', async () => {
  const inserted = new Document({
    repository,
    uuid: '00000000-0000-1000-8000-010000000000',
    format: 'png',
    url: new URI({ repository, uri: 'https://إختبار/', allocated: true })
  });
  const url = unwrap(await inserted.select('url'));
  await repository.insertDocument(inserted);

  await expect(repository.selectAllocatedURI('https://إختبار/'))
    .resolves
    .toHaveProperty('id', url.id);
});

test('inserts and allows to query documents by attached note id', async () => {
  const inserted = new Document({
    repository,
    uuid: '00000000-0000-1000-8000-010000000000',
    format: 'png',
    url: new URI({ repository, uri: 'https://إختبار/', allocated: true })
  });
  await repository.insertDocument(inserted);
  const note = await fabricateNote({ attachments: [inserted] });
  const noteId = unwrap(note.id);

  const [queried] = await repository.selectDocumentsByAttachedNoteId(noteId);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', inserted.id);
  expect(queried).toHaveProperty('uuid', '00000000-0000-1000-8000-010000000000');
  expect(queried).toHaveProperty('format', 'png');
});
