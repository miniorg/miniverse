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

test('inserts note and allows to query its status by the id of actor attributed to', async () => {
  const note = await fabricateNote();
  const { id, published, actorId } = unwrap(await note.select('status'));

  const [queried] = await repository.selectRecentStatusesIncludingExtensionsByActorId(actorId);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', id);
  expect(queried).toHaveProperty('published', published);
  expect(queried).toHaveProperty('actorId', actorId);
});

test('inverts note and allows to query its status along with it by the id of actor attributed to', async () => {
  const note = await fabricateNote();
  const status = unwrap(await note.select('status'));

  const [queried] = await repository.selectRecentStatusesIncludingExtensionsByActorId(status.actorId);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', status.id);
  expect(queried).toHaveProperty('published', status.published);
  expect(queried).toHaveProperty('actorId', status.actorId);
  expect(queried).toHaveProperty(['extension', 'repository'], repository);
  expect(queried).toHaveProperty(['extension', 'id'], note.id);
  expect(queried).toHaveProperty(['extension', 'content'], note.content);
});

test('inserts note and allows to put its status into inbox and query it', async () => {
  const note = await fabricateNote();
  const status = unwrap(await note.select('status'));
  const actor = unwrap(await status.select('actor'));
  const account = unwrap(await actor.select('account'));

  await repository.insertIntoInboxes([account], status);

  const [queried] =
    await repository.selectRecentStatusesIncludingExtensionsAndActorsFromInbox(
      account.id);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('published', status.published);
  expect(queried).toHaveProperty('id', status.id);
  expect(queried).toHaveProperty('actorId', status.actorId);
});
