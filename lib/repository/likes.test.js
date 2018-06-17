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

import Like from '../like';
import {
  fabricateLike,
  fabricateLocalAccount,
  fabricateNote
} from '../test/fabricator';
import repository from '../test/repository';

describe('deleteLikeByActorAndObject', () => {
  test('deletes like by actor and object', async () => {
    const { id, actor, object } = await fabricateLike();
    await repository.deleteLikeByActorAndObject(actor, object);
    await expect(repository.selectLikeById(id)).resolves.toBe(null);
  });

  test('rejects with an error if not found', async () => {
    const [actor, object] =
      await Promise.all([fabricateLocalAccount(), fabricateNote()]);

    await expect(repository.deleteLikeByActorAndObject(actor.person, object))
      .rejects
      .toBeInstanceOf(Error);
  });
});

describe('selectLikeById', () => test('resolves with null if not found', () =>
  expect(repository.selectLikeById(0)).resolves.toBe(null)));

test('inserts like and allows to query it by id', async () => {
  const [actor, object] =
    await Promise.all([fabricateLocalAccount(), fabricateNote()]);

  const inserted = new Like({ repository, actor: actor.person, object });
  await repository.insertLike(inserted);

  const queried = await repository.selectLikeById(inserted.id);
  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', inserted.id);
  expect(queried).toHaveProperty('actorId', actor.id);
  expect(queried).toHaveProperty('objectId', object.id);
});
