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
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import { uriConflicts } from '.';

test('inserts announce with URI and allows to query it', async () => {
  const [actor, object] = await Promise.all([
    fabricateRemoteAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateNote()
  ]);

  const recover = jest.fn();

  const { id } = await repository.insertAnnounce({
    status: { published: new Date, actor, uri: 'https://ReMoTe.إختبار/' },
    object
  }, recover);

  expect(recover).not.toHaveBeenCalled();
  await expect(repository.selectURIById(id))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});

test('inserts announce with URI reserved for note inReplyTo and allows to query it', async () => {
  const recover = jest.fn();
  const [actor, object] = await Promise.all([
    fabricateRemoteAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateNote(),
    fabricateLocalAccount().then(async account => repository.insertNote({
      status: {
        published: new Date,
        actor: unwrap(await account.select('actor')),
        uri: null
      },
      summary: null,
      content: '',
      inReplyTo: { id: null, uri: 'https://ReMoTe.إختبار/' },
      attachments: [],
      hashtags: [],
      mentions: []
    }, recover))
  ]);

  const { id } = await repository.insertAnnounce({
    status: { published: new Date, actor, uri: 'https://ReMoTe.إختبار/' },
    object
  }, recover);

  expect(recover).not.toHaveBeenCalled();
  await expect(repository.selectURIById(id))
    .resolves
    .toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});

test('rejects announce with conflicting URI', async () => {
  const [actor, object] = await Promise.all([
    fabricateRemoteAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateNote()
  ]);

  const recover = jest.fn();
  const recovery = {};

  await repository.insertAnnounce({
    status: { published: new Date, actor, uri: 'https://ReMoTe.إختبار/' },
    object
  }, recover);
  expect(recover).not.toHaveBeenCalled();

  await expect(repository.insertAnnounce({
    status: { published: new Date, actor, uri: 'https://ReMoTe.إختبار/' },
    object
  }, error => {
    expect(error[uriConflicts]).toBe(true);
    return recovery;
  })).rejects.toBe(recovery);
});

test('inserts announce without URI', async () => {
  const [actor, object] = await Promise.all([
    fabricateLocalAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateNote()
  ]);

  const recover = jest.fn();
  const { id } = await repository.insertAnnounce({
    status: { published: new Date, actor, uri: null },
    object
  }, recover);

  expect(recover).not.toHaveBeenCalled();
  await expect(repository.selectURIById(id))
    .resolves
    .toBe(null);
});
