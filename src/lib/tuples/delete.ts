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

import { Custom as CustomError } from '../errors';
import ParsedActivityStreams, { TypeNotAllowed } from '../parsed_activitystreams';
import Repository from '../repository';
import Actor from './actor';

export default class Delete {
  static async createFromParsedActivityStreams(repository: Repository, activity: ParsedActivityStreams, actor: Actor) {
    const type = await activity.getType();

    if (!type.has('Delete')) {
      throw new TypeNotAllowed('Unexpected type. Expected Delete.', 'info');
    }

    const object = await activity.getObject();
    if (!object) {
      throw new CustomError('Unspecified object.', 'error');
    }

    const id = await object.getId();
    if (typeof id != 'string') {
      throw new CustomError('id is invalid. Expected string.', 'error');
    }

    const uri = await repository.selectAllocatedURI(id);

    if (uri) {
      await repository.deleteStatusByUriAndAttributedTo(uri, actor);

      const documents = await repository.selectUnlinkedDocuments();
      const documentIds = documents.map(({ id }) => id);

      await repository.s3.service.deleteObjects({
        Bucket: repository.s3.bucket,
        Delete: {
          Objects: documents.map(({ uuid, format }) =>
            ({ Key: `${repository.s3.keyPrefix}${uuid}.${format}` }))
        }
      }).promise();

      await repository.deleteUnlinkedDocumentsByIds(documentIds);
    }

    return new this;
  }
}
