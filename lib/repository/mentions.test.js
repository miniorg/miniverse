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

import Mention from '../mention';
import { fabricateLocalAccount, fabricateNote } from '../test/fabricator';
import repository from '../test/repository';

test('inserts note and allows to query by its mentions', async () => {
  const account = await fabricateLocalAccount();
  const note = await fabricateNote({
    mentions: [new Mention({ repository, hrefId: account.person.id })]
  });

  await repository.insertNote(note);

  const mentions =
    await repository.selectMentionsIncludingPersonsByNoteId(note.id);

  expect(mentions[0]).toHaveProperty('hrefId', account.person.id);
});
