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
import { fabricateFollow, fabricateLocalAccount } from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';

const { signal } = new AbortController;

test('inserts and allows to query follow by its id', async () => {
  const recover = jest.fn();

  const [actor, object] = await Promise.all([
    fabricateLocalAccount({ actor: { username: '行動者' } })
      .then(account => account.select('actor', signal, recover))
      .then(unwrap),
    fabricateLocalAccount({ actor: { username: '被行動者' } })
      .then(account => account.select('actor', signal, recover))
      .then(unwrap)
  ]);

  const { id } = await fabricateFollow({ actor, object });

  const queriedFollow =
    await repository.selectFollowIncludingActorAndObjectById(id, signal, recover);

  expect(queriedFollow).toHaveProperty(['actor', 'repository'], repository);
  expect(queriedFollow).toHaveProperty(['actor', 'username'], '行動者');
  expect(queriedFollow).toHaveProperty(['actor', 'host'], null);
  expect(queriedFollow).toHaveProperty(['object', 'repository'], repository);
  expect(queriedFollow).toHaveProperty(['object', 'username'], '被行動者');
  expect(queriedFollow).toHaveProperty(['object', 'host'], null);
});

test('inserts and allows to delete follow', async () => {
  const insertedFollow = await fabricateFollow();
  const id = unwrap(insertedFollow.id);
  const recover = jest.fn();
  const [actor, object] = await Promise.all([
    insertedFollow.select('actor', signal, recover).then(unwrap),
    insertedFollow.select('object', signal, recover).then(unwrap)
  ]);

  await repository.deleteFollowByActorAndObject(actor, object, signal, recover);

  await expect(repository.selectFollowIncludingActorAndObjectById(
    id,
    signal,
    recover
  )).resolves.toBeNull();

  expect(recover).not.toHaveBeenCalled();
});

test('rejects when inserting a duplicate follow', async () => {
  const recover = jest.fn();
  const recovery = {};
  const insertedFollow = await fabricateFollow();
  const [actor, object] = await Promise.all([
    insertedFollow.select('actor', signal, recover).then(unwrap),
    insertedFollow.select('object', signal, recover).then(unwrap)
  ]);

  expect(recover).not.toHaveBeenCalled();

  await expect(repository.insertFollow(
    { actor, object },
    signal,
    () => recovery)).rejects.toBe(recovery);
})
