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

import { Body } from 'aws-sdk/clients/s3';
import { Document as ActivityStreams } from '../generated_activitystreams';
import generateUuid from '../generate_uuid';
import ParsedActivityStreams from '../parsed_activitystreams';
import Repository from '../repository';
import { fetch, temporaryError } from '../transfer';
import Relation, { Reference } from './relation';
import URI from './uri';
import sharp = require('sharp');

interface References {
  url: URI | null;
}

interface Properties {
  id?: string;
  uuid: string;
  format: string;
}

export const unexpectedType = Symbol();

export default class Document extends Relation<Properties, References> {
  id?: string;
  url?: Reference<URI | null>;
  readonly uuid!: string;
  readonly format!: string;

  async toActivityStreams(): Promise<ActivityStreams> {
    return {
      type: 'Document',
      mediaType: `image/${this.format}`,
      url: `${this.repository.s3.urlPrefix}/${this.uuid}.${this.format}`
    };
  }

  upload(data: Body) {
    return this.repository.s3.service.upload({
      Bucket: this.repository.s3.bucket,
      Body: data,
      ContentType: `image/${this.format}`,
      Key: `${this.repository.s3.keyPrefix}${this.uuid}.${this.format}`
    }).promise();
  }

  static async create(repository: Repository, url: string, recover: (error: Error & { [temporaryError]: boolean }) => unknown) {
    const [uuid, { data, info }] = await Promise.all([
      generateUuid(),
      fetch(repository, url, null, recover).then(({ body }) =>
        body.pipe(sharp()).toBuffer({ resolveWithObject: true }))
    ]);

    const document = new this({
      repository,
      uuid,
      format: info.format,
      url: new URI({ repository, uri: url, allocated: true })
    });

    await repository.insertDocument(document);

    try {
      await document.upload(data);
    } catch (error) {
      await repository.queue.add({ type: 'upload', id: document.id });
      throw error;
    }

    return document;
  }

  static async fromParsedActivityStreams(repository: Repository, object: ParsedActivityStreams, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const type = await object.getType(recover);
    if (!type.has('Document')) {
      throw recover(Object.assign(new Error('Unsupported type. Expected Document.'), { [unexpectedType]: true }));
    }

    const url = await object.getUrl(recover);
    if (!url) {
      throw recover(new Error('url unspecified.'));
    }

    const urlType = await url.getType(recover);
    if (!urlType.has('Link')) {
      throw recover(new Error('Unsupported url type. Expected Link.'));
    }

    const href = await url.getHref(recover);
    if (typeof href != 'string') {
      throw recover(new Error('Unsupported url\'s href type. Expected string.'));
    }

    const urlEntity = await repository.selectAllocatedURI(href);

    if (urlEntity) {
      if (!urlEntity.id) {
        throw new Error('URI\'s id cannot be fetched.');
      }

      return repository.selectDocumentById(urlEntity.id);
    }

    return this.create(repository, href, recover);
  }
}

Document.references =
  { url: { id: 'id', query: Document.withRepository('selectURIById') } };
