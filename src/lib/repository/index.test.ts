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

import Repository from '.';
import S3 = require('aws-sdk/clients/s3');

test('defaults finger host to host', async () => {
  const repository = new Repository({
    analytics: {},
    console,
    content: { frame: {}, image: {}, script: { sources: [] } },
    host: 'إختبار',
    pg: { host: 'localhost', port: 5432 },
    redis: {},
    s3: { service: new S3, bucket: '', keyPrefix: '', urlPrefix: '' }
  });

  try {
    expect(repository).toHaveProperty('fingerHost', 'إختبار');
  } finally {
    await repository.end();
  }
});

test('allows to override finger host', async () => {
  const repository = new Repository({
    analytics: {},
    console,
    content: { frame: {}, image: {}, script: { sources: [] } },
    fingerHost: 'إختبار',
    host: '',
    pg: { host: 'localhost', port: 5432 },
    redis: {},
    s3: { service: new S3, bucket: '', keyPrefix: '', urlPrefix: '' }
  });

  try {
    expect(repository).toHaveProperty('fingerHost', 'إختبار');
  } finally {
    await repository.end();
  }
});
