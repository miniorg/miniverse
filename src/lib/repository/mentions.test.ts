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
import { fabricateLocalAccount, fabricateNote } from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';

test('inserts note and allows to query its mentions', async () => {
  const recover = jest.fn();
  const { signal } = new AbortController;
  const account = await fabricateLocalAccount();
  const actor = unwrap(await account.select('actor', signal, recover));
  const note = await fabricateNote({ mentions: [actor] });

  const mentions = await repository.selectMentionsIncludingActorsByNoteId(
    note.id, signal, recover);

  expect(recover).not.toHaveBeenCalled();
  expect(mentions[0]).toHaveProperty('hrefId', actor.id);
});
