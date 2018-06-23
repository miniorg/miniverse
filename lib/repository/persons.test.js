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

describe('selectPersonById', () => {
  test('selects person by id', async () => {
    const account =
      await fabricateLocalAccount({ person: { username: 'username' } });

    const selected = await repository.selectPersonById(account.person.id);

    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', null);
  });

  test('selects person of local account by username and host', async () => {
    const account =
      await fabricateLocalAccount({ person: { username: 'username' } });

    const selected = await repository.selectPersonByUsernameAndNormalizedHost(
      'username', null);

    expect(selected).toHaveProperty('id', account.person.id);
    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', null);
  });

  test('selects person of remote account by username and host', async () => {
    const account = await fabricateRemoteAccount(
      { person: { username: 'username', host: 'FiNgEr.ReMoTe.xn--kgbechtv' } });

    const selected = await repository.selectPersonByUsernameAndNormalizedHost(
      'username', 'finger.remote.xn--kgbechtv');

    expect(selected).toHaveProperty('id', account.person.id);
    expect(selected).toHaveProperty('username', 'username');
    expect(selected).toHaveProperty('host', 'FiNgEr.ReMoTe.xn--kgbechtv');
  });

  test('resolves with null if not found', () =>
    expect(repository.selectPersonById(0)).resolves.toBe(null));
});

test('inserts follow and allows to query person by its object', async () => {
  const { actor, object } = await fabricateFollow(
    { actor: await fabricateLocalAccount({ person: { username: '行動者' } }) });

  const [queried] = await repository.selectPersonsByFolloweeId(object.id);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', actor.id);
  expect(queried).toHaveProperty('username', '行動者');
  expect(queried).toHaveProperty('host', null);
});

test('inserts note and allow to query persons mentioned by the note', async () => {
  const { person } =
    await fabricateLocalAccount({ person: { username: 'AtTrIbUtEdTo' } });

  const note = await fabricateNote({
    status: { person },
    mentions: [{ href: person }]
  });

  const [queried] = await repository.selectPersonsMentionedByNoteId(note.id);
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', person.id);
  expect(queried).toHaveProperty('username', 'AtTrIbUtEdTo');
  expect(queried).toHaveProperty('host', null);
});
