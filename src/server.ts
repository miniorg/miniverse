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

import Repository from './lib/repository';
import options from './options';
import processJobs from './subsystems/processor';
import serve from './subsystems/server';

const repository = new Repository(options);

if (!process.env.NO_PROCESSOR) {
  processJobs(repository);
}

const server = serve(repository).listen(Number(process.env.PORT));
server.on('error', repository.console.error);

function terminate() {
  const paused = repository.queue.pause(true);
  server.close(() => paused.then(() => repository.end()));
}

process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);
