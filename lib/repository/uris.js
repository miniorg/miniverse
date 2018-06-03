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
  async deleteURI(uri) {
    const { rowCount } = await this.pg.query({
      name: 'deleteURI',
      text: 'DELETE FROM uris WHERE id = $1',
      values: [uri.id]
    });

    if (rowCount <= 0) {
      throw new Error;
    }
  },

  async loadURI(uri) {
    if (this.loadeds.has(uri)) {
      return uri;
    }

    const { rows } = await this.pg.query({
      name: 'loadURI',
      text: 'SELECT * FROM uris WHERE id = $1',
      values: [uri.id]
    });

    uri.uri = rows[0].uri;

    this.loadeds.add(uri);
  },

  async selectURI(uri) {
    const { rows } = await this.pg.query({
      name: 'selectURI',
      text: 'SELECT * FROM uris WHERE uri = $1',
      values: [uri]
    });

    if (rows[0]) {
      const entity = new URI({ repository: this, id: rows[0].id, uri });
      this.loadeds.add(entity);
      return entity;
    }

    return null;
  }
};
