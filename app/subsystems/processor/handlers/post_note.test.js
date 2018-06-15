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

import {
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../../../../lib/test/fabricator';
import repository from '../../../../lib/test/repository';
import postNote from './post_note';
import nock from 'nock';

test('delivers to remote account', async () => {
  const [recipient, person] = await Promise.all([
    fabricateRemoteAccount(
      { inboxURI: { uri: 'https://ReCiPiEnT.إختبار/?inbox' } }),
    fabricateLocalAccount()
  ]);

  const note = await fabricateNote({ status: { person } });

  const post = nock('https://ReCiPiEnT.إختبار').post('/?inbox').reply(200);

  try {
    await postNote(repository, {
      data: { noteId: note.id, inboxURIId: recipient.inboxURIId }
    });

    expect(post.isDone()).toBe(true);
  } finally {
    nock.cleanAll();
  }
});
