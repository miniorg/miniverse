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
import RemoteAccount from '../remote_account';
import Note from '../note';
import Person from '../person';
import Status from '../status';
import repository from '../test_repository';
import URI from '../uri';

test('inserts and deletes note and prevent from querying its properties', async () => {
  const person = new Person({
    repository,
    account: new RemoteAccount({
      repository,
      inboxURI: new URI({ repository, uri: '' }),
      publicKeyURI: new URI({ repository, uri: '' }),
      publicKeyPem: '',
      uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/attributed_to' })
    }),
    username: '',
    host: 'FiNgEr.ReMoTe.إختبار'
  });

  await repository.insertRemoteAccount(person.account);

  const note = new Note({
    repository,
    status: new Status({
      repository,
      person,
      uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/' })
    }),
    content: '内容',
    mentions: []
  });

  await repository.insertNote(note);

  const uri = await repository.selectURI('https://ReMoTe.إختبار/');
  await repository.deleteStatusByUriAndAttributedTo(uri, person);

  await expect(repository.selectRecentStatusesIncludingExtensionsByPersonId(person.id))
    .resolves
    .toEqual([]);
});

test('inserts note and allows to query by its id', async () => {
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

  const queried = await repository.selectNoteById(note.id);

  expect(queried).toHaveProperty('repository', repository);
  expect(queried).toHaveProperty('id', note.id);
  expect(queried).toHaveProperty('content', '内容');
});
