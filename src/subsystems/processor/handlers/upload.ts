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

import { Job } from 'bull';
import { Custom as CustomError } from '../../../lib/errors';
import Repository from '../../../lib/repository';
import { fetch } from '../../../lib/transfer';
import sharp = require('sharp');

interface Data {
  readonly id: string;
}

export default async function (repository: Repository, { data }: Job<Data>) {
  const document = await repository.selectDocumentById(data.id);
  if (!document) {
    throw new CustomError('Document not found.', 'error');
  }

  const url = await document.select('url');
  if (!url) {
    throw new CustomError('Document URL not found.', 'error');
  }

  const { body } = await fetch(repository, url.uri);

  await document.upload(body.pipe(sharp().toFormat(document.format)));
}
