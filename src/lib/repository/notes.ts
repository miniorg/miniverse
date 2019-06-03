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

import Document from '../tuples/document';
import Hashtag from '../tuples/hashtag';
import Mention from '../tuples/mention';
import Note from '../tuples/note';
import Status from '../tuples/status';
import URI from '../tuples/uri';
import Repository from '.';

function parse(this: Repository, { id, in_reply_to_id, summary, content }: {
  readonly id: string;
  readonly in_reply_to_id: string | null;
  readonly summary: string;
  readonly content: string;
}) {
  return new Note({
    repository: this,
    id,
    inReplyToId: in_reply_to_id,
    summary: summary || null,
    content
  });
}

export default class {
  async insertNote(this: Repository, note: Note & {
    readonly status: Status & { readonly uri: URI };
    readonly attachments: Document[];
    readonly hashtags: Hashtag[];
    readonly mentions: Mention[];
  }, inReplyToUri: null | string, recover: (error: Error) => unknown) {
    let result;

    try {
      result = await this.pg.query({
        name: 'insertNote',
        text: 'SELECT * FROM insert_note($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) AS (id BIGINT, in_reply_to_id BIGINT)',
        values: [
          note.status.published,
          note.status.uri && note.status.uri.uri,
          note.status.actorId,
          note.inReplyToId,
          inReplyToUri,
          note.summary || '',
          note.content,
          note.attachments.map(({ id }) => id),
          note.hashtags.map(({ name }) => name),
          note.mentions.map(({ hrefId }) => hrefId)
        ]
      });
    } catch (error) {
      if (error.code == '23502') {
        throw recover(new Error('uri conflicts.'));
      }

      throw error;
    }

    note.id = result.rows[0].id;
    note.status.id = note.id;
    note.inReplyToId = result.rows[0].in_reply_to_id;

    if (note.status.uri) {
      note.status.uri.id = note.id;
    }
  }

  async selectNoteById(this: Repository, id: string): Promise<Note | null> {
    const { rows } = await this.pg.query({
      name: 'selectNoteById',
      text: 'SELECT * FROM notes WHERE id = $1',
      values: [id]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  }
}
