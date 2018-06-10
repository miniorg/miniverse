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

function parse({ id, attributed_to_id, content }) {
  return new Note({
    repository: this,
    id,
    attributedToId: attributed_to_id,
    content
  });
}

export default {
  async deleteNoteByUriAndAttributedTo(uri, attributedTo) {
    const { rowCount } = await this.pg.query({
      name: 'deleteNoteByUriAndAttributedTo',
      text: 'DELETE FROM notes USING uris WHERE uris.id = $1 AND notes.attributed_to_id = $2',
      values: [uri.id, attributedTo.id]
    });

    if (rowCount <= 0) {
      throw new Error;
    }
  },

  async insertNote(note, uri) {
    const { rows } = await this.pg.query({
      name: 'insertNote',
      text: 'SELECT insert_note($1, $2, $3, $4)',
      values: [
        uri,
        note.attributedTo.id,
        note.content,
        note.mentions.map(({ href }) => href.id)
      ]
    });

    note.id = rows[0].insert_note;
  },

  async selectNoteById(id) {
    const { rows } = await this.pg.query({
      name: 'selectNoteById',
      text: 'SELECT * FROM notes WHERE id = $1',
      values: [id]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  },

  async selectRecentNotesByUsernameAndNormalizedHost(username, normalizedHost) {
    const { rows } =  await this.pg.query({
      name: 'selectRecentNotesByUsernameAndNormalizedHost',
      text: 'SELECT notes.* FROM notes JOIN persons ON notes.attributed_to_id = persons.id WHERE persons.username = $1 AND lower(persons.host) = $2 ORDER BY notes.id DESC',
      values: [username, normalizedHost || '']
    });

    return rows.map(parse, this);
  },
 
  async selectRecentNotesFromInbox(id) {
    const ids = await this.redis.client.zrevrange(`${this.redis.prefix}inbox:${id}`, 0, -1);
    const { rows } = await this.pg.query({
      name: 'selectRecentNotesFromInbox',
      text: 'SELECT notes.* FROM notes WHERE id = ANY($1)',
      values: [ids]
    });

    return ids.map(id => rows.find(row => row.id == id))
              .filter(Boolean)
              .map(parse, this);
  }
};
