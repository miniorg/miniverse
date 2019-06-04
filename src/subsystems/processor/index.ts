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
import { Job } from 'bull';
import { globalAgent } from 'https';
import Repository from '../../lib/repository';
import { temporaryError } from '../../lib/transfer';
import handlers from './handlers';

export default function(repository: Repository) {
  repository.queue.process(globalAgent.maxFreeSockets, job => {
    const indexableHandlers = handlers as {
      readonly [key: string]: (
        (
          repository: Repository,
          job: Job<unknown>,
          signal: AbortSignal,
          recover: (error: Error & { [temporaryError]?: boolean }) => unknown
        ) => Promise<void>
      ) | undefined;
    };

    const handle = indexableHandlers[job.data.type];
    if (!handle) {
      repository.console.error(`Unrecoverable error caused by job ${job.id}.`);
      throw new Error('Invalid data type.');
    }

    const controller = new AbortController;
    const recovery: { error?: Error } = {};
    let discard = Promise.resolve();

    const promise: Promise<void> & {
      cancel?: () => unknown;
    } = handle(repository, job, controller.signal, error => {
      if (!error[temporaryError]) {
        discard = job.discard();
      }

      recovery.error = error;
      return recovery;
    }).catch(error => discard.then(() => {
      if (error == recovery) {
        throw recovery.error;
      }

      repository.console.error(`Unrecoverable error caused by job ${job.id}.`);
      throw error;
    }));

    promise.cancel = () => controller.abort();
    return promise;
  });
}
