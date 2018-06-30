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

import { fabricateLocalAccount, fabricateNote } from '../test/fabricator';
import repository from '../test/repository';

test('inserts note and allows to query its mentions', async () => {
  const account = await fabricateLocalAccount();
  const note =
    await fabricateNote({ mentions: [{ hrefId: account.actor.id }] });

  const mentions =
    await repository.selectMentionsIncludingActorsByNoteId(note.id);

  expect(mentions[0]).toHaveProperty('hrefId', account.actor.id);
});
