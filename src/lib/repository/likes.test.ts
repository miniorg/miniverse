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
import {
  fabricateLike,
  fabricateLocalAccount,
  fabricateNote
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';

const { signal } = new AbortController;

describe('deleteLikeByActorAndObject', () => {
  test('deletes like by actor and object', async () => {
    const recover = jest.fn();
    const like = await fabricateLike();
    const [actor, object] = await Promise.all([
      like.select('actor', signal, recover).then(unwrap),
      like.select('object', signal, recover).then(unwrap)
    ]);

    await repository.deleteLikeByActorAndObject(actor, object, signal, recover);
    await expect(repository.selectLikeById(like.id, signal, recover))
      .resolves.toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('selectLikeById', () => {
  test('resolves with null if not found', async () => {
    const recover = jest.fn();

    await expect(repository.selectLikeById('0', signal, recover))
      .resolves.toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });
});

test('inserts like and allows to query it by id', async () => {
  const recover = jest.fn();

  const [actor, object] = await Promise.all([
    fabricateLocalAccount()
      .then(account => account.select('actor', signal, recover))
      .then(unwrap),
    fabricateNote()
  ]);

  const seed = { actor, object };
  const inserted = await repository.insertLike(seed, signal, recover);

  const queried = await repository.selectLikeById(inserted.id, signal, recover);
  expect(recover).not.toHaveBeenCalled();
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', inserted.id);
  expect(queried).toHaveProperty('actorId', actor.id);
  expect(queried).toHaveProperty('objectId', object.id);
});

test('rejects when inserting a duplicate like', async () => {
  const recover = jest.fn();
  const [actor, object] = await Promise.all([
    fabricateLocalAccount()
      .then(account => account.select('actor', signal, recover))
      .then(unwrap),
    fabricateNote()
  ]);

  const recovery = {};
  await repository.insertLike({ actor, object }, signal, recover);

  await expect(repository.insertLike(
    { actor, object },
    signal,
    () => recovery)).rejects.toBe(recovery);
});
