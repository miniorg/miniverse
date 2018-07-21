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
import { unwrap } from '../test/types';

test('inserts announce with URI and allows to query it', async () => {
  const [actor, object] = await Promise.all([
    fabricateRemoteAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateNote()
  ]);

  const announce = new Announce({
    repository,
    status: new Status({
      repository,
      published: new Date,
      actor,
      uri: new URI({
        repository,
        uri: 'https://ReMoTe.إختبار/',
        allocated: true
      })
    }),
    object
  });

  await repository.insertAnnounce(announce);

  await expect(repository.selectURIById(unwrap(announce.id)))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});

test('inserts announce with URI which reserved for note inReplyTo and allows to query it', async () => {
  const [actor, object] = await Promise.all([
    fabricateRemoteAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateNote(),
    fabricateLocalAccount().then(async account => {
      const note = new Note({
        repository,
        status: new Status({
          repository,
          published: new Date,
          actor: unwrap(await account.select('actor'))
        }),
        summary: null,
        content: '',
        hashtags: [],
        mentions: []
      });

      await repository.insertNote(note, 'https://ReMoTe.إختبار/');
    })
  ]);

  const announce = new Announce({
    repository,
    status: new Status({
      repository,
      published: new Date,
      actor,
      uri: new URI({
        repository,
        uri: 'https://ReMoTe.إختبار/',
        allocated: true
      })
    }),
    object
  });

  await repository.insertAnnounce(announce);

  await expect(repository.selectURIById(unwrap(announce.id)))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});

test('inserts announce without URI', async () => {
  const [actor, object] = await Promise.all([
    fabricateRemoteAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateNote()
  ]);

  const announce = new Announce({
    repository,
    status: new Status({ repository, published: new Date, actor }),
    object
  });

  await repository.insertAnnounce(announce);

  await expect(repository.selectURIById(unwrap(announce.id)))
    .resolves
    .toBe(null);
});
