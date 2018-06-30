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

import Announce from '../announce';
import Note from '../note';
import Status from '../status';
import URI from '../uri';
import {
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';

test('inserts announce with URI and allows to query it', async () => {
  const [{ actor }, object] =
    await Promise.all([fabricateRemoteAccount(), fabricateNote()]);

  const announce = new Announce({
    repository,
    status: new Status({
      repository,
      actor,
      uri: new URI({ uri: 'https://ReMoTe.إختبار/' })
    }),
    object
  });

  await repository.insertAnnounce(announce);

  await expect(repository.selectURIById(announce.id))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});

test('inserts announce with URI which reserved for note inReplyTo and allows to query it', async () => {
  const [{ actor }, object, { inReplyToId }] = await Promise.all([
    fabricateRemoteAccount(),
    fabricateNote(),
    fabricateLocalAccount().then(async ({ actor }) => {
      const note = new Note({
        repository,
        status: new Status({ repository, actor }),
        content: '',
        hashtags: [],
        mentions: []
      });

      await repository.insertNote(note, 'https://ReMoTe.إختبار/');

      return note;
    })
  ]);

  const announce = new Announce({
    repository,
    status: new Status({
      repository,
      actor,
      uri: new URI({ uri: 'https://ReMoTe.إختبار/' })
    }),
    object
  });

  await repository.insertAnnounce(announce);
  expect(announce.id).not.toBe(inReplyToId);

  await expect(repository.selectURIById(announce.id))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});

test('inserts announce without URI', async () => {
  const [{ actor }, object] =
    await Promise.all([fabricateRemoteAccount(), fabricateNote()]);

  const announce = new Announce({
    repository,
    status: new Status({ repository, actor }),
    object
  });

  await repository.insertAnnounce(announce);

  await expect(repository.selectURIById(announce.id))
    .resolves
    .toBe(null);
});
