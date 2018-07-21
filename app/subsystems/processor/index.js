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

import { globalAgent } from 'https';
import { Temporary as TemporaryError } from '../../../lib/errors';
import handlers from './handlers';

export default repository =>
  repository.queue.process(globalAgent.maxFreeSockets, job =>
    handlers[job.data.type](repository, job).catch(async error => {
      if (!(error instanceof TemporaryError)) {
        await job.discard();
      }

      throw error;
    }));
