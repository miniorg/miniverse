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

import Person from '../person';

function parse({ id, username, host }) {
  return new Person({ repository: this, id, username, host: host || null });
}

export default {
  async selectPersonById(id) {
    const { rows } = await this.pg.query({
      name: 'selectPersonById',
      text: 'SELECT * FROM persons WHERE id = $1',
      values: [id]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  },

  async selectPersonByUsernameAndNormalizedHost(username, normalizedHost) {
    const { rows } = await this.pg.query({
      name: 'selectPersonByUsernameAndNormalizedHost',
      text: 'SELECT * FROM persons WHERE username = $1 AND lower(host) = $2',
      values: [username, normalizedHost || '']
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  },

  async selectPersonsByFollowee({ id }) {
    const { rows } = await this.pg.query({
      name: 'selectPersonsByFollowee',
      text: 'SELECT persons.* FROM persons JOIN follows ON persons.id = follows.actor_id WHERE follows.object_id = $1',
      values: [id]
    });

    return rows.map(parse, this);
  },

  async selectPersonsMentionedByNoteId(id) {
    const { rows } = await this.pg.query({
      name: 'selectPersonsMentionedByNoteId',
      text: 'SELECT persons.* FROM persons JOIN mentions ON persons.id = mentions.href_id WHERE mentions.note_id = $1',
      values: [id]
    });

    return rows.map(parse, this);
  }
};
