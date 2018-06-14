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

import Note from '../note';

function parse({ id, content }) {
  return new Note({ repository: this, id, content });
}

export default {
  async insertNote(note) {
    const { rows } = await this.pg.query({
      name: 'insertNote',
      text: 'SELECT insert_note($1, $2, $3, $4)',
      values: [
        note.status.uri && note.status.uri.uri,
        note.status.personId,
        note.content,
        note.mentions.map(({ href }) => href.id)
      ]
    });

    note.id = rows[0].insert_note;
    note.status.id = note.id;

    if (note.status.uri) {
      note.status.uri.id = note.id;
    }
  },

  async selectNoteById(id) {
    const { rows } = await this.pg.query({
      name: 'selectNoteById',
      text: 'SELECT * FROM notes WHERE id = $1',
      values: [id]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  }
};
