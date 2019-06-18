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
import URI from '../tuples/uri';
import Repository from '.';

export default class {
  async selectURIById(
    this: Repository,
    id: string,
    signal: AbortSignal,
    recover: (error: Error & { name: string }) => unknown
  ): Promise<URI | null> {
    const { rows } = await this.pg.query({
      name: 'selectURIById',
      text: 'SELECT * FROM uris WHERE id = $1',
      values: [id]
    }, signal, error => error.name == 'AbortError' ? recover(error) : error);

    return rows[0] ? new URI({
      repository: this,
      id,
      uri: rows[0].uri,
      allocated: rows[0].allocated
    }) : null;
  }

  async selectAllocatedURI(
    this: Repository,
    uri: string,
    signal: AbortSignal,
    recover: (error: Error & { name: string }) => unknown
  ): Promise<URI | null> {
    const { rows } = await this.pg.query({
      name: 'selectAllocatedURI',
      text: 'SELECT * FROM uris WHERE uri = $1 AND allocated',
      values: [uri]
    }, signal, error => error.name == 'AbortError' ? recover(error) : error);

    return rows[0] ? new URI({
      repository: this,
      id: rows[0].id,
      uri,
      allocated: rows[0].allocated
    }) : null;
  }
}
