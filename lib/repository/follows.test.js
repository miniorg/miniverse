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
import LocalPerson from '../local_person';
import repository from '../test_repository';

test('inserts follow and allows to query its properties', async () => {
  const actor = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: '行動者',
    host: null
  });

  const object = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: '被行動者',
    host: null
  });

  await Promise.all([
    repository.insertLocalPerson(actor),
    repository.insertLocalPerson(object)
  ]);

  const follow = new Follow(repository, null, { actor, object });
  await repository.insertFollow(follow);

  const properties = await repository.loadFollowIncludingActorAndObject(follow);

  expect(properties).toHaveProperty(['actor', 'id'], actor.id);
  expect(properties).toHaveProperty(['object', 'id'], object.id);
});

test('inserts and allows to delete follow', async () => {
  const actor = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: '行動者',
    host: null
  });

  const object = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: '被行動者',
    host: null
  });

  await Promise.all([
    repository.insertLocalPerson(actor),
    repository.insertLocalPerson(object)
  ]);

  const follow = new Follow(repository, null, { actor, object });
  await repository.insertFollow(follow);

  await repository.deleteFollowByActorAndObject(actor, object);

  await expect(repository.loadFollowIncludingActorAndObject(follow))
    .rejects
    .toBeInstanceOf(Error);
});
