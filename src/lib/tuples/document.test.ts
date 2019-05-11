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

import ParsedActivityStreams, {
  AnyHost,
  TypeNotAllowed
} from '../parsed_activitystreams';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Document from './document';
import URI from './uri';
import nock = require('nock');

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" />';

describe('toActivityStreams', () => {
  test('resolves with ActivityStreams representation', () => {
    const document = new Document({
      repository,
      uuid: '00000000-0000-1000-8000-010000000000',
      format: 'svg',
      url: new URI({ repository, uri: 'https://إختبار/', allocated: true })
    });

    return expect(document.toActivityStreams()).resolves.toEqual({
      type: 'Document',
      mediaType: `image/svg`,
      url: `https://dOcUmEnTs.xn--kgbechtv/00000000-0000-1000-8000-010000000000.svg`
    });
  });
});

describe('upload', () => {
  test('uploads object', async () => {
    const document = new Document({
      repository,
      uuid: '00000000-0000-1000-8000-010000000000',
      format: 'svg',
      url: new URI({ repository, uri: 'https://إختبار/', allocated: true })
    });

    await document.upload(Buffer.from(svg));

    await expect(repository.s3.service.headObject({
      Bucket: repository.s3.bucket,
      Key: `documents/00000000-0000-1000-8000-010000000000.svg`
    }).promise()).resolves.toHaveProperty('ContentType', 'image/svg');
  });
});

describe('create', () => {
  test('creates and returns document', async () => {
    let created;

    nock('https://إختبار').get('/').reply(200, svg);

    try {
      created = await Document.create(repository, 'https://إختبار/');
    } finally {
      nock.cleanAll();
    }

    const createdURL = await created.select('url');

    expect(created).toBeInstanceOf(Document);
    expect(created).toHaveProperty('repository', repository);

    expect(createdURL).toBeInstanceOf(URI);
    expect(createdURL).toHaveProperty('uri', 'https://إختبار/');
    expect(createdURL).toHaveProperty('allocated', true);

    const queried = await repository.selectDocumentById(unwrap(created.id));
    const queriedURL = await unwrap(queried).select('url');

    expect(queried).toHaveProperty('id', created.id);
    expect(queried).toHaveProperty('uuid', created.uuid);
    expect(queried).toHaveProperty('format', 'png');
    expect(queriedURL).toHaveProperty('uri', 'https://إختبار/');
    expect(createdURL).toHaveProperty('allocated', true);

    await expect(repository.s3.service.headObject({
      Bucket: repository.s3.bucket,
      Key: `documents/${created.uuid}.png`
    }).promise()).resolves.toHaveProperty('ContentType', 'image/png');
  });

  test('queues upload job if upload failed', async () => {
    const { bucket } = repository.s3;
    nock('https://إختبار').get('/').reply(200, svg);
    repository.s3.bucket = `${process.env.AWS_S3_BUCKET}-test-invalid`;

    try {
      await expect(Document.create(repository, 'https://إختبار/')).rejects.toEqual(expect.anything());
    } finally {
      nock.cleanAll();
      repository.s3.bucket = bucket;
    }

    await expect((await repository.queue.getWaiting())[0])
      .toHaveProperty(['data', 'type'], 'upload');
  });
});

describe('fromParsedActivityStreams', () => {
  test('creates document from Activity Streams', async () => {
    const object = new ParsedActivityStreams(repository, {
      type: 'Document',
      url: 'https://DoCuMeNt.إختبار/'
    }, AnyHost);
    let created;

    nock('https://DoCuMeNt.إختبار').get('/').reply(200, svg);

    try {
      created = await Document.fromParsedActivityStreams(repository, object);
    } finally {
      nock.cleanAll();
    }

    await expect(created).toHaveProperty('format', 'png');
  });

  test('resolves document already fetched', async () => {
    const object = new ParsedActivityStreams(repository, {
      type: 'Document',
      url: 'https://DoCuMeNt.إختبار/'
    }, AnyHost);
    let created;

    nock('https://DoCuMeNt.إختبار').get('/').reply(200, svg);

    try {
      created = await Document.fromParsedActivityStreams(repository, object);
    } finally {
      nock.cleanAll();
    }

    await expect(Document.fromParsedActivityStreams(repository, object))
      .resolves
      .toHaveProperty('id', unwrap(created).id);
  });

  test('rejects with TypeNotAllowed if type is not Document', async () => {
    const object = new ParsedActivityStreams(repository, {
      type: 'https://TyPe.إختبار/',
      url: 'https://DoCuMeNt.إختبار/'
    }, AnyHost);

    nock('https://DoCuMeNt.إختبار').get('/').reply(200, svg);

    try {
      await expect(Document.fromParsedActivityStreams(repository, object))
        .rejects
        .toBeInstanceOf(TypeNotAllowed)
    } finally {
      nock.cleanAll();
    }
  });

  test('rejects with TypeNotAllowed if url type is not Link', async () => {
    const object = new ParsedActivityStreams(repository, {
      type: 'Document',
      url: { type: 'https://TyPe.إختبار/', href: 'https://DoCuMeNt.إختبار/' }
    }, AnyHost);

    nock('https://DoCuMeNt.إختبار').get('/').reply(200, svg);

    try {
      await expect(Document.fromParsedActivityStreams(repository, object))
        .rejects
        .toBeInstanceOf(TypeNotAllowed)
    } finally {
      nock.cleanAll();
    }
  });
});
