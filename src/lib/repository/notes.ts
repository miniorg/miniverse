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

import { AbortSignal } from 'abort-controller';
import Hashtag from '../tuples/hashtag';
import Mention from '../tuples/mention';
import Note, { Seed } from '../tuples/note';
import Status from '../tuples/status';
import URI from '../tuples/uri';
import Repository, { conflict } from '.';

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
  async insertNote(this: Repository, {
    status,
    inReplyTo,
    summary,
    content,
    attachments,
    hashtags,
    mentions
  }: Seed, signal: AbortSignal, recover: (error: Error & {
    name?: string;
    [conflict]?: boolean;
  }) => unknown) {
    const { rows: [{ id, in_reply_to_id }] } = await this.pg.query({
      name: 'insertNote',
      text: 'SELECT * FROM insert_note($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) AS (id BIGINT, in_reply_to_id BIGINT)',
      values: [
        status.published,
        status.uri,
        status.actor.id,
        inReplyTo.id,
        inReplyTo.uri,
        summary || '',
        content,
        attachments.map(({ id }) => id),
        hashtags,
        mentions.map(({ id }) => id)
      ]
    }, signal, error => {
      if (error.name == 'AbortError') {
        return recover(error);
      }

      if (error.code == '23502') {
        return recover(Object.assign(
          new Error('uri conflicts.'),
          { [conflict]: true }));
      }

      return error;
    });

    return new Note({
      repository: this,
      status: new Status({
        repository: this,
        id,
        published: status.published,
        actor: status.actor,
        uri: status.uri == null ? null : new URI({
          repository: this,
          id,
          uri: status.uri,
          allocated: true
        })
      }),
      inReplyToId: in_reply_to_id,
      summary,
      content,
      attachments,
      hashtags: hashtags.map(name => new Hashtag({ repository: this, name })),
      mentions: mentions.map(href => new Mention({ repository: this, href }))
    });
  }

  async selectNoteById(
    this: Repository,
    id: string,
    signal: AbortSignal,
    recover: (error: Error & { name: string }) => unknown
  ): Promise<Note | null> {
    const { rows } = await this.pg.query({
      name: 'selectNoteById',
      text: 'SELECT * FROM notes WHERE id = $1',
      values: [id]
    }, signal, error => error.name == 'AbortError' ? recover(error) : error);

    return rows[0] ? parse.call(this, rows[0]) : null;
  }
}
