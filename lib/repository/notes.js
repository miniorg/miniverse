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

function parse({ id, in_reply_to_id, summary, content }) {
  return new Note({
    repository: this,
    id,
    inReplyToId: in_reply_to_id,
    summary: summary || null,
    content
  });
}

export default {
  async insertNote(note, inReplyToUri) {
    const { rows } = await this.pg.query({
      name: 'insertNote',
      text: 'SELECT * FROM insert_note($1, $2, $3, $4, $5, $6, $7, $8, $9) AS (id BIGINT, in_reply_to_id BIGINT)',
      values: [
        note.status.published,
        note.status.uri && note.status.uri.uri,
        note.status.actorId,
        note.inReplyToId,
        inReplyToUri,
        note.summary || '',
        note.content,
        note.hashtags.map(({ name }) => name),
        note.mentions.map(({ hrefId }) => hrefId)
      ]
    });

    note.id = rows[0].id;
    note.status.id = note.id;
    note.inReplyToId = rows[0].in_reply_to_id;

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
