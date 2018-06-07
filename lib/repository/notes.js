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
  return new Note({ id, attributedToId: attributed_to_id, content });
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
    const { rows } = await this.pg.query(uri ? {
      name: 'insertNoteWithUri',
      text: 'SELECT insert_note_with_uri($1, $2, $3)',
      values: [uri, note.attributedTo.id, note.content]
    } : {
      name: 'insertNote',
      text: 'INSERT INTO notes (attributed_to_id, content) VALUES ($1, $2) RETURNING id',
      values: [note.attributedTo.id, note.content]
    });

    note.id = rows[0].id;
  },

  async selectRecentNotesByUsernameAndNormalizedHost(username, normalizedHost) {
    const { rows } =  await this.pg.query({
      name: 'selectRecentNotesByUsernameAndNormalizedHost',
      text: 'SELECT notes.* FROM notes JOIN persons ON notes.attributed_to_id = persons.id WHERE persons.username = $1 AND lower(persons.host) = $2 ORDER BY notes.id DESC',
      values: [username, normalizedHost || '']
    });

    return rows.map(parse.bind(this));
  },
 
  async selectRecentNotesFromInbox({ person }) {
    const ids = await this.redis.client.zrevrange(`${this.redis.prefix}inbox:${person.id}`, 0, -1);
    const { rows } = await this.pg.query({
      name: 'selectRecentNotesFromInbox',
      text: 'SELECT notes.* FROM notes WHERE id = ANY(string_to_array($1, \',\')::integer[])',
      values: [ids.join()]
    });

    return ids.map(id => rows.find(row => row.id == id))
              .filter(Boolean)
              .map(parse.bind(this));
  }
};
