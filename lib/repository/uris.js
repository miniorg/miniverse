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

import RemotePerson from '../remote_person';
import URI from '../uri';

function getExtension(id, relname) {
  return relname == 'remote_persons' ? new RemotePerson(this, id) : null;
}

export default {
  async loadURI({ id }) {
    const { rows } = await this.pg.query({
      name: 'loadURI',
      text: 'SELECT pg_class.relname, uris.uri FROM uris JOIN pg_class ON uris.tableoid = pg_class.oid WHERE id = $1',
      values: [id]
    });

    return {
      extension: getExtension(id, rows[0].relname),
      uri: rows[0].uri
    };
  },

  async selectURI(uri) {
    const { rows } = await this.pg.query({
      name: 'selectURI',
      text: 'SELECT pg_class.relname, uris.id FROM uris JOIN pg_class ON uris.tableoid = pg_class.oid WHERE uri = $1',
      values: [uri]
    });

    return rows[0] ? new URI(this, rows[0].id, {
      extension: getExtension(rows[0].id, rows[0].relname),
      uri
    }) : null;
  }
};
