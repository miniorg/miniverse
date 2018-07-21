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

import {
  fabricateFollow,
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import postStatus from './post_status';

test('inserts into inboxes of local followers', async () => {
  const actorAccount = await fabricateLocalAccount();
  const actor = unwrap(await actorAccount.select('actor'));
  const follow = await fabricateFollow({ actor });
  const object = unwrap(await follow.select('object'));

  const note = await fabricateNote({
    status: { actor: object },
    content: '内容'
  });

  await postStatus(repository, unwrap(await note.select('status')));

  expect((await actorAccount.select('inbox'))[0])
    .toHaveProperty(['extension', 'content'], '内容');
});

test('does not insert into local inboxes of remote followers', async () => {
  const actorAccount = await fabricateRemoteAccount();
  const actor = unwrap(await actorAccount.select('actor'));
  const follow = await fabricateFollow({ actor });
  const object = unwrap(await follow.select('object'));
  const note = await fabricateNote({ status: { actor: object } });

  await postStatus(repository, unwrap(await note.select('status')));

  await expect(repository.selectRecentStatusesIncludingExtensionsAndActorsFromInbox(unwrap(actorAccount.id)))
    .resolves
    .toHaveProperty('length', 0);
});

test('posts note to inboxes of remote followers', async () => {
  const actorAccount = await fabricateRemoteAccount();
  const actor = unwrap(await actorAccount.select('actor'));
  const follow = await fabricateFollow({ actor });
  const object = unwrap(await follow.select('object'));
  const note = await fabricateNote({ status: { actor: object } });

  await postStatus(repository, unwrap(await note.select('status')));

  await expect((await repository.queue.getWaiting())[0])
    .toHaveProperty(['data', 'type'], 'postStatus')
});

test('deduplicates remote inboxes', async () => {
  const actors = [];

  for (let index = 0; index < 2; index++) {
    const { actor } =
      await fabricateRemoteAccount({ inboxURI: { uri: '' } });
    actors[index] = actor;
  }

  const objectAccount = await fabricateLocalAccount();
  const object = unwrap(await objectAccount.select('actor'));

  await Promise.all(actors.map(actor => fabricateFollow({ actor, object })));

  const note = await fabricateNote({ status: { actor: object } });
  await postStatus(repository, unwrap(await note.select('status')));

  await expect(repository.queue.getWaiting())
    .resolves
    .toHaveProperty('length', 1);
});

test('does not post note to inboxes of remote followers if note is remote', async () => {
  const [actor, object] = await Promise.all([
    fabricateRemoteAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateRemoteAccount()
      .then(account => account.select('actor'))
      .then(unwrap)
  ]);

  await fabricateFollow({ actor, object });

  const note = await fabricateNote({ status: { actor: object } });
  await postStatus(repository, unwrap(await note.select('status')));

  await expect(repository.queue.getWaiting())
    .resolves
    .toHaveProperty('length', 0);
});
