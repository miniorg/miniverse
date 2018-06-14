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

import LocalAccount from '../local_account';
import Note from '../note';
import Person from '../person';
import Status from '../status';
import repository from '../test_repository';

test('inserts note and allows to query its status by the username and host of person attributed to', async () => {
  const person = new Person({
    repository,
    account: new LocalAccount({
      repository,
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username: '',
    host: null
  });

  await repository.insertLocalAccount(person.account);

  const note = new Note({
    repository,
    status: new Status({ repository, person }),
    content: '内容',
    mentions: []
  });

  await repository.insertNote(note);

  const [queried] =
    await repository.selectRecentStatusesIncludingExtensionsAndPersonsByUsernameAndNormalizedHost('', null);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.status.id);
  expect(queried).toHaveProperty('personId', note.status.personId);
});

test('inserts note and allows to put one into inbox and query its status with it', async () => {
  const person = new Person({
    repository,
    account: new LocalAccount({
      repository,
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username: '',
    host: null
  });

  await repository.insertLocalAccount(person.account);

  const note = new Note({
    repository,
    status: new Status({ repository, person }),
    content: '内容',
    mentions: []
  });

  await repository.insertNote(note);

  await repository.insertIntoInboxes([person.account], note);

  const [queried] =
    await repository.selectRecentStatusesIncludingExtensionsAndPersonsFromInbox(
      person.account.id);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.status.id);
  expect(queried).toHaveProperty('personId', note.status.personId);
});
