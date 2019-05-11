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

import { Pool, QueryConfig } from 'pg';
import { inspect } from 'util';
import { Custom as CustomError } from '../errors';

export default class {
  readonly pg: Pool;

  constructor(pg: Pool) {
    this.pg = pg;
  }

  async query(query: QueryConfig | string) {
    try {
      return await this.pg.query(query);
    } catch(error) {
      const message = typeof query == 'string' ?
        `failed to query ${query}: ${error.message}` :
        `failed to query ${query.text} with ${inspect(query.values)}: ${error.message}`;

      throw new CustomError(message, 'error', [error]);
    }
  }
}
