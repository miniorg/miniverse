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

import { AbortSignal } from 'abort-controller';
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
  id: string;
  uuid: string;
  format: string;
}

export const unexpectedType = Symbol();

export default class Document extends Relation<Properties, References> {
  readonly id!: string;
  readonly url?: Reference<URI | null>;
  readonly uuid!: string;
  readonly format!: string;

  async toActivityStreams(): Promise<ActivityStreams> {
    return {
      type: 'Document',
      mediaType: `image/${this.format}`,
      url: `${this.repository.s3.urlPrefix}/${this.uuid}.${this.format}`
    };
  }

  static async create(repository: Repository, url: string, signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const [uuid, { data, info: { format } }] = await Promise.all([
      generateUuid(),
      fetch(repository, url, { signal }, recover).then(({ body }) =>
        body.pipe(sharp()).toBuffer({ resolveWithObject: true }))
    ]);

    const dirty = await repository.insertDirtyDocument(uuid, format);

    try {
      await repository.s3.service.upload({
        Bucket: repository.s3.bucket,
        Body: data,
        ContentType: `image/${format}`,
        Key: `${repository.s3.keyPrefix}${uuid}.${format}`
      }).promise();

      return await repository.insertDocument(dirty, url, recover);
    } catch (error) {
      await repository.s3.service.deleteObject({
        Bucket: repository.s3.bucket,
        Key: `${repository.s3.keyPrefix}${uuid}.${format}`
      }).promise();

      await repository.deleteDirtyDocument(dirty);
      throw error;
    }
  }

  static async fromParsedActivityStreams(repository: Repository, object: ParsedActivityStreams, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const type = await object.getType(signal, recover);
    if (!type.has('Document')) {
      throw recover(Object.assign(new Error('Unsupported type. Expected Document.'), { [unexpectedType]: true }));
    }

    const url = await object.getUrl(signal, recover);
    if (!url) {
      throw recover(new Error('url unspecified.'));
    }

    const urlType = await url.getType(signal, recover);
    if (!urlType.has('Link')) {
      throw recover(new Error('Unsupported url type. Expected Link.'));
    }

    const href = await url.getHref(signal, recover);
    if (typeof href != 'string') {
      throw recover(new Error('Unsupported url\'s href type. Expected string.'));
    }

    const urlEntity = await repository.selectAllocatedURI(href);

    if (urlEntity) {
      return repository.selectDocumentById(urlEntity.id);
    }

    return this.create(repository, href, signal, recover);
  }
}

Document.references =
  { url: { id: 'id', query: Document.withRepository('selectURIById') } };
