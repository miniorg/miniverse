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

import Delete from './delete';
import ParsedActivityStreams from './parsed_activitystreams';
import { fabricateNote } from './test/fabricator';
import repository, { AnyHost } from './test/repository';

describe('fromParsedActivityStreams', () => test('deletes note', async () => {
  const note = await fabricateNote(
    { status: { uri: {  uri: 'https://ReMoTe.إختبار/' } } });

  const activityStreams = new ParsedActivityStreams(repository, {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Delete',
    object: 'https://ReMoTe.إختبار/'
  }, AnyHost);

  await expect(Delete.fromParsedActivityStreams(
    repository, activityStreams, note.status.person))
      .resolves
      .toBeInstanceOf(Delete);

  await expect(repository.selectRecentStatusesIncludingExtensionsByPersonId(note.status.personId))
    .resolves
    .toEqual([]);
}));
