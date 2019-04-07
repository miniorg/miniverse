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

import { domainToASCII } from 'url';
import generateUuid from '../generate_uuid';
import { TypeNotAllowed } from '../parsed_activitystreams';
import { fetch } from '../transfer';
import Relation, { withRepository } from './relation';
import URI from './uri';

const sharp = require('sharp');

export default class Document extends Relation {
  async toActivityStreams() {
    return {
      type: 'Document',
      mediaType: `image/${this.format}`,
      url: `https://${domainToASCII(this.repository.host)}/documents/${this.uuid}.${this.format}`
    };
  }

  async upload(data) {
    await this.repository.s3.service.upload({
      Bucket: this.repository.s3.bucket,
      Body: data,
      ContentType: `image/${this.format}`,
      Key: `documents/${this.uuid}.${this.format}`
    }).promise();
  }

  static async create(repository, url) {
    const [uuid, { data, info }] = await Promise.all([
      generateUuid(),
      fetch(repository, url).then(({ body }) =>
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

  static async fromParsedActivityStreams(repository, object) {
    const type = await object.getType();
    if (!type.has('Document')) {
      throw new TypeNotAllowed('Unsupported type. Expected Document.', 'info');
    }

    const url = await object.getUrl();
    const urlType = await url.getType();
    if (!urlType.has('Link')) {
      throw new TypeNotAllowed('Unsupported type. Expected Link.', 'info');
    }

    const href = await url.getHref();
    const urlEntity = await repository.selectAllocatedURI(href);

    if (urlEntity) {
      return repository.selectDocumentById(urlEntity.id);
    }

    return this.create(repository, href);
  }
}

Document.references =
  { url: { id: 'id', query: withRepository('selectURIById') } };
