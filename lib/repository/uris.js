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

import URI from '../uri';

export default {
  async selectURIById(id) {
    const { rows } = await this.pg.query({
      name: 'selectURIById',
      text: 'SELECT * FROM uris WHERE id = $1',
      values: [id]
    });

    return rows[0] ? new URI({ repository: this, id, uri: rows[0].uri }) : null;
  },

  async selectURI(uri) {
    const { rows } = await this.pg.query({
      name: 'selectURI',
      text: 'SELECT * FROM uris WHERE uri = $1',
      values: [uri]
    });

    return rows[0] ? new URI({ repository: this, id: rows[0].id, uri }) : null;
  }
};
