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
import { fabricateNote } from '../test/fabricator';
import repository from '../test/repository';

test('inserts note and allows to query its hashtags', async () => {
  const { id } = await fabricateNote({ hashtags: ['名前'] });
  const recover = jest.fn();
  const { signal } = new AbortController;
  const hashtags = await repository.selectHashtagsByNoteId(id, signal, recover);
  expect(recover).not.toHaveBeenCalled();
  expect(hashtags[0]).toHaveProperty('name', '名前');
});
