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
import { globalAgent } from 'https';
import {
  Custom as CustomError,
  Temporary as TemporaryError
} from '../../lib/errors';
import Repository from '../../lib/repository';
import handlers from './handlers';

export default function(repository: Repository) {
  repository.queue.process(globalAgent.maxFreeSockets, job => {
    const indexableHandlers = handlers as { readonly [key: string]: ((repository: Repository, job: Job<unknown>) => Promise<unknown>) | undefined };

    const handle = indexableHandlers[job.data.type];
    if (!handle) {
      throw new CustomError('Invalid data type.', 'error');
    }

    return handle(repository, job).catch(async (error: unknown) => {
      if (!(error instanceof TemporaryError)) {
        await job.discard();
      }

      throw error;
    });
  });
}
