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

import { AbortController, AbortSignal } from 'abort-controller';
import ParsedActivityStreams from '../parsed_activitystreams';
import Repository from '../repository';
import { temporaryError } from '../transfer';
import Actor from './actor';

export const unexpectedType = Symbol();

export default class Delete {
  static async createFromParsedActivityStreams(
    repository: Repository,
    activity: ParsedActivityStreams,
    actor: Actor,
    signal: AbortSignal,
    recover: (error: Error & {
      [temporaryError]?: boolean;
      [unexpectedType]?: boolean;
    }) => unknown
  ) {
    const type = await activity.getType(signal, recover);

    if (!type.has('Delete')) {
      throw recover(Object.assign(
        new Error('Unsupported type. Expected Delete.'),
        { [unexpectedType]: true }));
    }

    const object = await activity.getObject(signal, recover);
    if (!object) {
      throw recover(new Error('object unspecified.'));
    }

    const id = await object.getId(recover);
    if (typeof id != 'string') {
      throw recover(new Error('Unsupported id type. Expected string.'));
    }

    const uri = await repository.selectAllocatedURI(id, signal, recover);

    if (uri) {
      await repository.deleteStatusByUriAndAttributedTo(
        uri, actor, signal, recover);

      const documents =
        await repository.selectUnlinkedDocuments(signal, recover);
      const documentIds = documents.map(({ id }) => id);
      const controller = new AbortController;

      await repository.s3.service.deleteObjects({
        Bucket: repository.s3.bucket,
        Delete: {
          Objects: documents.map(({ uuid, format }) =>
            ({ Key: `${repository.s3.keyPrefix}${uuid}.${format}` }))
        }
      }).promise();

      await repository.deleteUnlinkedDocumentsByIds(
        documentIds, controller.signal, recover);
    }

    return new this;
  }
}
