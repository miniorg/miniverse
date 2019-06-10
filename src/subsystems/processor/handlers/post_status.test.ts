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
import {
  fabricateAnnounce,
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../../../lib/test/fabricator';
import repository from '../../../lib/test/repository';
import { unwrap } from '../../../lib/test/types';
import postStatus from './post_status';
import nock = require('nock');

test('delivers announce to remote account', async () => {
  const [recipient, actor] = await Promise.all([
    fabricateRemoteAccount(
      { inbox: { uri: 'https://ReCiPiEnT.إختبار/?inbox' } }),
    fabricateLocalAccount()
      .then(account => account.select('actor'))
      .then(unwrap)
  ]);

  const announce = await fabricateAnnounce({ status: { actor } });

  const job = await repository.queue.add({
    statusId: announce.id,
    inboxURIId: recipient.inboxURIId
  });

  const recover = jest.fn();
  const post = nock('https://ReCiPiEnT.إختبار').post('/?inbox').reply(200);

  try {
    await postStatus(repository, job, (new AbortController).signal, recover);
    expect(post.isDone()).toBe(true);
  } finally {
    nock.cleanAll();
  }

  expect(recover).not.toHaveBeenCalled();
});

test('delivers note to remote account', async () => {
  const [recipient, actor] = await Promise.all([
    fabricateRemoteAccount(
      { inbox: { uri: 'https://ReCiPiEnT.إختبار/?inbox' } }),
    fabricateLocalAccount()
      .then(account => account.select('actor'))
      .then(unwrap)
  ]);

  const note = await fabricateNote({ status: { actor } });

  const job = await repository.queue.add({
    statusId: note.id,
    inboxURIId: recipient.inboxURIId
  });

  const recover = jest.fn();
  const post = nock('https://ReCiPiEnT.إختبار').post('/?inbox').reply(200);

  try {
    await postStatus(repository, job, (new AbortController).signal, recover);
    expect(post.isDone()).toBe(true);
  } finally {
    nock.cleanAll();
  }

  expect(recover).not.toHaveBeenCalled();
});
