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
  const note = await fabricateNote({ content: '内容' });

  const queried = await repository.selectNoteById(note.id);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.id);
  expect(queried).toHaveProperty('content', '内容');
});
