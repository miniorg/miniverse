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
import { Job } from 'bull';
import Repository from '../../../lib/repository';
import { fetch, temporaryError } from '../../../lib/transfer';
import sharp = require('sharp');

interface Data {
  readonly id: string;
}

export default async function (repository: Repository, { data }: Job<Data>, signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  const document = await repository.selectDocumentById(data.id);
  if (!document) {
    throw recover(new Error('Document not found.'));
  }

  const url = await document.select('url');
  if (!url) {
    throw recover(new Error('Document url not found.'));
  }

  const { body } = await fetch(repository, url.uri, { signal }, recover);

  await document.upload(body.pipe(sharp().toFormat(document.format)));
}
