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

test('inserts note and allows to query its status by the id of person attributed to', async () => {
  const note = await fabricateNote();

  const [queried] = await repository.selectRecentStatusesIncludingExtensionsByPersonId(note.status.personId);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.status.id);
  expect(queried).toHaveProperty('personId', note.status.personId);
});

test('inverts note and allows to query its status along with it by the id of person attributed to', async () => {
  const note = await fabricateNote();

  const [queried] = await repository.selectRecentStatusesIncludingExtensionsByPersonId(note.status.personId);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.status.id);
  expect(queried).toHaveProperty('personId', note.status.personId);
  expect(queried).toHaveProperty(['extension', 'repository'], repository);
  expect(queried).toHaveProperty(['extension', 'id'], note.id);
  expect(queried).toHaveProperty(['extension', 'content'], note.content);
});

test('inserts note and allows to put one into inbox and query its status with it', async () => {
  const note = await fabricateNote();

  await repository.insertIntoInboxes([note.status.person.account], note);

  const [queried] =
    await repository.selectRecentStatusesIncludingExtensionsAndPersonsFromInbox(
      note.status.person.account.id);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.status.id);
  expect(queried).toHaveProperty('personId', note.status.personId);
});
