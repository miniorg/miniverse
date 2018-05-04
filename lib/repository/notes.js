/*
  Copyright (C) 2018  Akihiko Odaki <nekomanma@pixiv.co.jp>

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

export default {
  async insertNote(note) {
    const { rows } = await this.pg.query({
      name: 'insertNote',
      text: 'INSERT INTO notes (attributed_to_id, content) VALUES ($1, $2) RETURNING id',
      values: [note.attributedTo.id, note.content]
    });

    note.id = rows[0].id;
    this.loadeds.add(note);
  },

  async selectRecentNotesByLowerUsernameAndHost(lowerUsername, lowerHost) {
    const { rows } =  await this.pg.query({
      name: 'selectRecentNotesByLowerUsername',
      text: 'SELECT notes.* FROM notes JOIN persons ON notes.attributed_to_id = persons.id WHERE lower(persons.username) = $1 AND lower(persons.host) = $2 ORDER BY notes.id DESC',
      values: [lowerUsername, lowerHost || '']
    });

    return rows.map(row => {
      const note = new Note(row);
      this.loadeds.add(note);
      return note;
    });
  },
 
  async selectRecentNotesFromInbox({ person }) {
    const ids = await this.redis.client.zrevrange(`inbox:${person.id}`, 0, -1);
    const { rows } = await this.pg.query({
      name: 'selectRecentNotesFromInbox',
      text: 'SELECT notes.* FROM notes WHERE id = ANY(string_to_array($1, \',\')::integer[])',
      values: [ids.join()]
    });

    return ids.map(id => rows.find(row => row.id == id))
              .filter(Boolean)
              .map(row => {
      const note = new Note(row);
      this.loadeds.add(note);
      return note;
    });
  }
};
