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
import Repository from '../repository';
import { unwrap } from './types';
import S3 = require('aws-sdk/clients/s3');

// assign process.env.JEST_WORKER_ID=1 when in runInBand mode by ranyitz · Pull Request #5860 · facebook/jest
// https://github.com/facebook/jest/pull/5860
const database = `${process.env.PGDATABASE || process.env.USER}_test_${process.env.JEST_WORKER_ID || '1'}`;

const testRepository = new Repository({
  analytics: {},
  console,
  content: { frame: {}, image: {}, script: { sources: [] } },
  fingerHost: 'FiNgEr.إختبار',
  host: 'إختبار',
  pg: {
    database,
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT && parseInt(process.env.PGPORT) || 5432
  },
  s3: {
    service: new S3({
      endpoint: process.env.AWS_ENDPOINT,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      signatureVersion: process.env.AWS_SIGNATURE_VERSION,
      s3BucketEndpoint: Boolean(process.env.AWS_S3_BUCKET_ENDPOINT),
      s3ForcePathStyle: Boolean(process.env.AWS_S3_FORCE_PATH_STYLE)
    }),
    bucket: `${process.env.AWS_S3_BUCKET}-test-${process.env.JEST_WORKER_ID || '1'}`,
    keyPrefix: 'documents/',
    urlPrefix: 'https://dOcUmEnTs.xn--kgbechtv'
  },
  redis: {
    url: process.env.REDIS,
    prefix: `${process.env.REDIS_PREFIX || 'miniverse:'}test:${process.env.JEST_WORKER_ID || '1'}:`
  }
});

const { pg, redis, s3 } = testRepository;

const asyncTruncateQuery: Promise<{ rows: { tablename: string }[] }> = pg.query(
  'SELECT tablename FROM pg_tables WHERE schemaname = \'public\'',
  (new AbortController).signal,
  error => error
);

afterAll(() => testRepository.end());

afterEach(() => Promise.all([
  asyncTruncateQuery.then(({ rows }) => pg.query(
    'TRUNCATE ' + rows.map(({ tablename }) => tablename).join(),
    (new AbortController).signal,
    error => error)),
  s3.service
    .listObjects({ Bucket: s3.bucket })
    .promise()
    .then(({ Contents }) => unwrap(Contents))
    .then(Contents => Contents.map(({ Key }) => ({ Key: unwrap(Key) })))
    .then(Objects => s3.service
      .deleteObjects({ Bucket: s3.bucket, Delete: { Objects } })
      .promise()),

  redis.client.keys(`${redis.prefix}*`).then(keys =>
    keys.length && redis.client.del(...keys)),
]));

export default testRepository;
