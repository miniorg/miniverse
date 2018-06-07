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

import Follow from '../follow';
import LocalAccount from '../local_account';
import Person from '../person';
import repository from '../test_repository';

describe('deleteFollowByActorAndObject', () =>
  test('rejects if not found', async () => {
    const actor = new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '行動者',
      host: null
    });

    const object = new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '被行動者',
      host: null
    });

    await Promise.all([
      repository.insertLocalAccount(actor.account),
      repository.insertLocalAccount(object.account)
    ]);

    await expect(repository.deleteFollowByActorAndObject(actor, object))
      .rejects
      .toBeInstanceOf(Error);
  }));

test('inserts and allows to query follow by its id', async () => {
  const insertedFollow = new Follow({
    actor: new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '行動者',
      host: null
    }),
    object: new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '被行動者',
      host: null
    })
  });

  await Promise.all([
    repository.insertLocalAccount(insertedFollow.actor.account),
    repository.insertLocalAccount(insertedFollow.object.account)
  ]);

  await repository.insertFollow(insertedFollow);

  const queriedFollow =
    await repository.selectFollowIncludingActorAndObjectById(insertedFollow.id);

  expect(queriedFollow).toHaveProperty(['actor', 'repository'], repository);
  expect(queriedFollow).toHaveProperty(['actor', 'username'], '行動者');
  expect(queriedFollow).toHaveProperty(['actor', 'host'], null);
  expect(queriedFollow).toHaveProperty(['object', 'repository'], repository);
  expect(queriedFollow).toHaveProperty(['object', 'username'], '被行動者');
  expect(queriedFollow).toHaveProperty(['object', 'host'], null);
});

test('inserts and allows to delete follow', async () => {
  const insertedFollow = new Follow({
    actor: new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '行動者',
      host: null
    }),
    object: new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '被行動者',
      host: null
    })
  });

  await Promise.all([
    repository.insertLocalAccount(insertedFollow.actor.account),
    repository.insertLocalAccount(insertedFollow.object.account)
  ]);

  await repository.insertFollow(insertedFollow);
  await repository.deleteFollowByActorAndObject(
    insertedFollow.actor, insertedFollow.object);

  await expect(repository.selectFollowIncludingActorAndObjectById(insertedFollow.id))
    .rejects
    .toBeInstanceOf(Error);
});
