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
  fabricateFollow,
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../../../../lib/test/fabricator';
import repository from '../../../../lib/test/repository';
import { unwrap } from '../../../../lib/test/types';
import accept from './accept';

const nock = require('nock');

test('delivers to remote account', async () => {
  const [actor, object] = await Promise.all([
    fabricateRemoteAccount(
      { inboxURI: { uri: 'https://AcToR.إختبار/?inbox' } })
        .then(account => account.select('actor'))
        .then(unwrap),
    fabricateLocalAccount()
      .then(account => account.select('actor'))
      .then(unwrap)
  ]);

  const { id } = await fabricateFollow({ actor, object });

  const post = nock('https://AcToR.إختبار').post('/?inbox').reply(200);

  try {
    await accept(repository, { data: { objectId: unwrap(id) } });
    expect(post.isDone()).toBe(true);
  } finally {
    nock.cleanAll();
  }
});
