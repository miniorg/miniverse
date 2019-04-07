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
import Repository from './base';

const S3 = require('aws-sdk/clients/s3');

test('defaults finger host to host', () => {
  const repository = new Repository({
    analytics: {},
    captcha: {},
    console,
    content: { frame: {}, image: {}, script: { sources: [] } },
    host: 'إختبار',
    pg: new Pool,
    redis: {},
    s3: { service: new S3, bucket: '', urlPrefix: '' }
  });

  try {
    expect(repository).toHaveProperty('fingerHost', 'إختبار');
  } finally {
    repository.redis.client.disconnect();
    repository.redis.subscriber.disconnect();
  }
});

test('allows to override finger host', () => {
  const repository = new Repository({
    analytics: {},
    captcha: {},
    console,
    content: { frame: {}, image: {}, script: { sources: [] } },
    fingerHost: 'إختبار',
    pg: new Pool,
    redis: {},
    s3: { service: new S3, bucket: '', urlPrefix: '' }
  });

  try {
    expect(repository).toHaveProperty('fingerHost', 'إختبار');
  } finally {
    repository.redis.client.disconnect();
    repository.redis.subscriber.disconnect();
  }
});
