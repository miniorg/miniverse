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

import Announce from '../tuples/announce';
import Status from '../tuples/status';
import URI from '../tuples/uri';
import Repository from '.';

export default class {
  async insertAnnounce(this: Repository, announce: Announce & {
    readonly status: Status & { readonly uri: URI };
  }, recover: (error: Error) => unknown) {
    let result;

    try {
      result = await this.pg.query({
        name: 'insertAnnounce',
        text: 'SELECT insert_announce($1, $2, $3, $4)',
        values: [
          announce.status.published,
          announce.status.uri && announce.status.uri.uri,
          announce.status.actorId,
          announce.objectId
        ]
      });
    } catch (error) {
      if (error.code == '23502') {
        throw recover(new Error('uri conflicts.'));
      }

      throw error;
    }

    announce.id = result.rows[0].insert_announce;
    announce.status.id = announce.id;

    if (announce.status.uri) {
      announce.status.uri.id = announce.id;
    }
  }
}
