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

import { Pool } from 'pg';
import Repository from '../lib/repository';
import processJobs from './subsystems/processor';
import serve from './subsystems/server';

const repository = new Repository({
  analytics: {
    image: { sourceList: process.env.ANALYTICS_IMAGE_SOURCE_LIST },
    script: {
      sourceList: process.env.ANALYTICS_SCRIPT_SOURCE_LIST,
      source: process.env.ANALYTICS_SCRIPT_SOURCE
    },
    trackingId: process.env.ANALYTICS_TRACKING_ID
  },
  console,
  fingerHost: process.env.FINGER_HOST,
  host: process.env.HOST,
  pg: new Pool,
  redis: {
    prefix: process.env.REDIS_PREFIX,
    url: process.env.REDIS_URL
  }
});

if (!process.env.NO_PROCESSOR) {
  processJobs(repository);
}

serve(repository, process.env.PORT);
