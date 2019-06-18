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
import Announce, { Seed } from '../tuples/announce';
import Status from '../tuples/status';
import URI from '../tuples/uri';
import Repository, { conflict } from '.';

export default class {
  async insertAnnounce(
    this: Repository,
    { status, object }: Seed,
    signal: AbortSignal,
    recover: (error: Error & { name?: string; [conflict]?: boolean }) => unknown
  ) {
    const { rows: [{ insert_announce }]} = await this.pg.query({
      name: 'insertAnnounce',
      text: 'SELECT insert_announce($1, $2, $3, $4)',
      values: [
        status.published,
        status.uri,
        status.actor.id,
        object.id
      ]
    }, signal, error => {
      if (error.name == 'AbortError') {
        return recover(error);
      }

      if (error.code == '23502') {
        return recover(Object.assign(
          new Error('uri conflicts.'),
          { [conflict]: true }));
      }

      return error;
    });

    return new Announce({
      repository: this,
      status: new Status({
        repository: this,
        id: insert_announce,
        published: status.published,
        actor: status.actor,
        uri: status.uri == null ? null : new URI({
          repository: this,
          id: insert_announce,
          uri: status.uri,
          allocated: true
        })
      }),
      object
    });
  }
}
