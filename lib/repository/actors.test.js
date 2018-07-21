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

describe('selectActorById', () => {
  test('selects actor by id', async () => {
    const account = await fabricateLocalAccount(
      { actor: { username: 'username', name: '', summary: '' } });

    const selected = await repository.selectActorById(unwrap(account.id));

    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', null);
    expect(selected).toHaveProperty('name', '');
    expect(selected).toHaveProperty('summary', '');
  });

  test('selects actor of local account by username and host', async () => {
    const account = await fabricateLocalAccount(
      { actor: { username: 'username', name: '', summary: '' } });

    const selected = await repository.selectActorByUsernameAndNormalizedHost(
      'username', null);

    expect(selected).toHaveProperty('id', account.id);
    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', null);
    expect(selected).toHaveProperty('name', '');
    expect(selected).toHaveProperty('summary', '');
  });

  test('selects actor of remote account by username and host', async () => {
    const account = await fabricateRemoteAccount({
      actor: {
        username: 'username',
        host: 'FiNgEr.ReMoTe.xn--kgbechtv',
        name: '',
        summary: ''
      }
    });

    const selected = await repository.selectActorByUsernameAndNormalizedHost(
      'username', 'finger.remote.xn--kgbechtv');

    expect(selected).toHaveProperty('id', account.actor.id);
    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', 'FiNgEr.ReMoTe.xn--kgbechtv');
    expect(selected).toHaveProperty('name', '');
    expect(selected).toHaveProperty('summary', '');
  });

  test('resolves with null if not found', () =>
    expect(repository.selectActorById('0')).resolves.toBe(null));
});

test('inserts follow and allows to query actor by its object', async () => {
  const actorAccount = await fabricateLocalAccount(
    { actor: { username: '行動者', name: '', summary: '' } });

  const actor = unwrap(await actorAccount.select('actor'));
  const { objectId } = await fabricateFollow({ actor });

  const [queried] = await repository.selectActorsByFolloweeId(objectId);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', actor.id);
  expect(queried).toHaveProperty('username', '行動者');
  expect(queried).toHaveProperty('host', null);
  expect(queried).toHaveProperty('name', '');
  expect(queried).toHaveProperty('summary', '');
});

test('inserts note and allow to query actors mentioned by the note', async () => {
  const account = await fabricateLocalAccount(
     { actor: { username: 'AtTrIbUtEdTo', summary: '' } });

  const actor = unwrap(await account.select('actor'));
  const { id } = await fabricateNote({
    status: { actor },
    mentions: [{ href: actor }]
  });

  const [queried] = await repository.selectActorsMentionedByNoteId(unwrap(id));
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', actor.id);
  expect(queried).toHaveProperty('username', 'AtTrIbUtEdTo');
  expect(queried).toHaveProperty('host', null);
  expect(queried).toHaveProperty('name', '');
  expect(queried).toHaveProperty('summary', '');
});
