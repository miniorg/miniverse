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
import Person from '../person';

function parse({ id, uri, attributed_to_id, content }) {
  return {
    id,
    uri,
    attributedTo: new Person(this, attributed_to_id.toString()),
    content
  };
}

function constructNote(row) {
  return new Note(this, row.id, parse.call(this, row));
}

export default {
  async insertNote(note) {
    const { uri, attributedTo, content } = await note.get();
    const { rows } = await this.pg.query({
      name: 'insertNote',
      text: 'INSERT INTO notes (uri, attributed_to_id, content) SELECT $1, id, $3 FROM persons WHERE id = $2 RETURNING id',
      values: [uri, attributedTo.id, content]
    });

    if (!rows[0]) {
      throw new Error;
    }

    note.id = rows[0].id;
  },

  async loadNote({ id }) {
    const { rows } = await this.pg.query({
      name: 'loadNote',
      text: 'SELECT * FROM notes WHERE id = $1',
      values: [id]
    });

    return parse.call(this, rows[0]);
  },

  async selectRecentNotesByUsernameAndNormalizedHost(username, normalizedHost) {
    const { rows } = await this.pg.query({
      name: 'selectRecentNotesByUsernameAndNormalizedHost',
      text: 'SELECT notes.* FROM notes JOIN persons ON notes.attributed_to_id = persons.id WHERE persons.username = $1 AND lower(persons.host) = $2 ORDER BY notes.id DESC',
      values: [username, normalizedHost || '']
    });

    return rows.map(constructNote.bind(this));
  },
 
  async selectRecentNotesFromInbox({ id }) {
    const ids = await this.redis.client.zrevrange(`${this.redis.prefix}inbox:${id}`, 0, -1);
    const { rows } = await this.pg.query({
      name: 'selectRecentNotesFromInbox',
      text: 'SELECT notes.* FROM notes WHERE id = ANY(string_to_array($1, \',\')::integer[])',
      values: [ids.join()]
    });

    return ids.map(id => rows.find(row => row.id == id))
              .filter(Boolean)
              .map(constructNote.bind(this));
  }
};
