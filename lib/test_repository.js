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
import Repository from './repository';

// assign process.env.JEST_WORKER_ID=1 when in runInBand mode by ranyitz · Pull Request #5860 · facebook/jest
// https://github.com/facebook/jest/pull/5860
const database = `${process.env.PGDATABASE || process.env.USER}_test_${process.env.JEST_WORKER_ID || '1'}`;

const testRepository = new Repository({
  console,
  fingerHost: 'FiNgEr.إختبار',
  host: 'إختبار',
  pg: new Pool({ database }),
  redis: {
    url: process.env.REDIS,
    prefix: `${process.env.REDIS_PREFIX || 'miniverse:'}test:${process.env.JEST_WORKER_ID || '1'}:`
  }
});

const { pg, redis } = testRepository;

const asyncTables = testRepository.pg.query(
  'SELECT tablename FROM pg_tables WHERE schemaname = \'public\'');

afterAll(() => {
  redis.client.disconnect();
  redis.subscriber.disconnect();
  return testRepository.pg.end();
});

afterEach(() => Promise.all([
  Promise.all([
    asyncTables,

    // For "ON DELETE RESTRICT" constraints
    pg.query('TRUNCATE TABLE announces'),
    pg.query('TRUNCATE TABLE local_accounts'),
    pg.query('TRUNCATE TABLE remote_accounts')
  ]).then(([{ rows }]) => Promise.all(rows.map(({ tablename }) =>
    pg.query(`DELETE FROM ${tablename}`)))),

  redis.client.keys(`${testRepository.redis.prefix}*`).then(keys =>
    keys.length && redis.client.del(keys))
]));

export default testRepository;
