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

import repository from '../../../lib/test/repository';
import { unwrap } from '../../../lib/test/types';
import Document from '../../../lib/tuples/document';
import URI from '../../../lib/tuples/uri';
import upload from './upload';

const nock = require('nock');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" />';

test('uploads', async () => {
  const document = new Document({
    repository,
    uuid: '00000000-0000-1000-8000-010000000000',
    format: 'png',
    url: new URI({ repository, uri: 'https://إختبار/', allocated: true })
  });

  await repository.insertDocument(document);
  nock('https://إختبار').get('/').reply(200, svg);

  try {
    await upload(repository, { data: { id: unwrap(document.id) } });
  } finally {
    nock.cleanAll();
  }

  await expect(repository.s3.service.headObject({
    Bucket: repository.s3.bucket,
    Key: `documents/00000000-0000-1000-8000-010000000000.png`
  }).promise()).resolves.toHaveProperty('ContentType', 'image/png');
});
