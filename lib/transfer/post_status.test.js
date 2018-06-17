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
import postStatus from './post_status';

test('inserts into inboxes of local followers', async () => {
  const actorAccount = await fabricateLocalAccount();
  const { object } = await fabricateFollow({ actor: actorAccount.person });

  const note = await fabricateNote({
    status: { person: object },
    content: '内容'
  });

  await postStatus(repository, note.status);

  expect((await actorAccount.select('inbox'))[0])
    .toHaveProperty(['extension', 'content'], '内容');
});

test('does not insert into local inboxes of remote followers', async () => {
  const actorAccount = await fabricateRemoteAccount();
  const { object } = await fabricateFollow({ actor: actorAccount.person });
  const note = await fabricateNote({ status: { person: object } });

  await postStatus(repository, note.status);

  await expect(repository.selectRecentStatusesIncludingExtensionsAndPersonsFromInbox(actorAccount.id))
    .resolves
    .toHaveProperty('length', 0);
});

test('posts note to inboxes of remote followers', async () => {
  const { person } = await fabricateRemoteAccount();
  const { object } = await fabricateFollow({ actor: person });
  const note = await fabricateNote({ status: { person: object } });

  await postStatus(repository, note.status);

  await expect((await repository.queue.getWaiting())[0])
    .toHaveProperty(['data', 'type'], 'postStatus')
});

test('deduplicates remote inboxes', async () => {
  const actors = [];

  for (let index = 0; index < 2; index++) {
    const { person } =
      await fabricateRemoteAccount({ inboxURI: { uri: '' } });
    actors[index] = person;
  }

  const { person } = await fabricateLocalAccount();

  await Promise.all(actors.map(actor =>
    fabricateFollow({ actor, object: person })));

  const note = await fabricateNote({ status: { person } });
  await postStatus(repository, note.status);

  await expect(repository.queue.getWaiting())
    .resolves
    .toHaveProperty('length', 1);
});

test('does not post note to inboxes of remote followers if note is remote', async () => {
  const [actor, object] =
    await Promise.all([fabricateRemoteAccount(), fabricateRemoteAccount()]);

  await fabricateFollow({ actor: actor.person, object: object.person });

  const note = await fabricateNote({ status: { person: object.person } });
  await postStatus(repository, note.status);

  await expect(repository.queue.getWaiting())
    .resolves
    .toHaveProperty('length', 0);
});
