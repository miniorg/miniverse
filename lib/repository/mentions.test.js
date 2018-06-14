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
import Mention from '../mention';
import Note from '../note';
import Person from '../person';
import Status from '../status';
import repository from '../test_repository';

test('inserts note and allows to query by its mentions', async () => {
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
    mentions: [new Mention({ repository, href: person })]
  });

  await repository.insertNote(note);

  const mentions =
    await repository.selectMentionsIncludingPersonsByNoteId(note.id);

  expect(mentions[0]).toHaveProperty(['href', 'id'], person.id);
});
