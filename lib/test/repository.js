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

import { Pool } from 'pg';
import Repository from '../repository';

// assign process.env.JEST_WORKER_ID=1 when in runInBand mode by ranyitz · Pull Request #5860 · facebook/jest
// https://github.com/facebook/jest/pull/5860
const database = `${process.env.PGDATABASE || process.env.USER}_test_${process.env.JEST_WORKER_ID || '1'}`;

const testRepository = new Repository({
  analytics: {},
  captcha: {},
  console,
  content: { frame: {}, image: {}, script: { sources: [] } },
  fingerHost: 'FiNgEr.إختبار',
  host: 'إختبار',
  pg: new Pool({ database }),
  redis: {
    url: process.env.REDIS,
    prefix: `${process.env.REDIS_PREFIX || 'miniverse:'}test:${process.env.JEST_WORKER_ID || '1'}:`
  }
});

const { pg, redis } = testRepository;

const asyncTruncateQuery =
  pg.query('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'')
    .then(({ rows }) =>
       'TRUNCATE ' + rows.map(({ tablename }) => tablename).join());

afterAll(() => {
  redis.client.disconnect();
  redis.subscriber.disconnect();
  return testRepository.pg.pg.end();
});

afterEach(() => Promise.all([
  asyncTruncateQuery.then(pg.query.bind(pg)),

  redis.client.keys(`${testRepository.redis.prefix}*`).then(keys =>
    keys.length && redis.client.del(...keys))
]));

export default testRepository;
