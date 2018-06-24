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

export default {
  async insertAnnounce(announce) {
    const { rows } = await this.pg.query({
      name: 'insertAnnounce',
      text: 'SELECT insert_announce($1, $2, $3, $4)',
      values: [
        announce.status.published,
        announce.status.uri && announce.status.uri.uri,
        announce.status.personId,
        announce.objectId
      ]
    });

    announce.id = rows[0].insert_announce;
    announce.status.id = announce.id;

    if (announce.status.uri) {
      announce.status.uri.id = announce.id;
    }
  }
};
