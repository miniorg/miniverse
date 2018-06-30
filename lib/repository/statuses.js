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

import Actor from '../actor';
import Announce from '../announce';
import Note from '../note';
import Status from '../status';

function parseExtension({ id, announce_object_id, note_in_reply_to_id, note_summary, note_content }) {
  return announce_object_id ? new Announce({
    repository: this,
    id,
    object: new Note({
      repository: this,
      id: announce_object_id,
      inReplyToId: note_in_reply_to_id,
      summary: note_summary || null,
      content: note_content
    })
  }) : new Note({
    repository: this,
    id,
    inReplyToId: note_in_reply_to_id,
    summary: note_summary || null,
    content: note_content
  });
}

export default {
  async deleteStatusByUriAndAttributedTo(uri, attributedTo) {
    const { rowCount } = await this.pg.query({
      name: 'deleteStatusByUriAndAttributedTo',
      text: 'SELECT delete_status($1, $2)',
      values: [uri.id, attributedTo.id]
    });

    if (rowCount <= 0) {
      throw new Error;
    }
  },

  async selectRecentStatusesIncludingExtensionsByActorId(actorId) {
    const { rows } = await this.pg.query({
      name: 'selectRecentStatusesIncludingExtensionsByActorId',
      text: 'SELECT statuses.*, announces.object_id AS announce_object_id, notes.in_reply_to_id AS note_in_reply_to_id, notes.summary AS note_summary, notes.content AS note_content FROM statuses LEFT OUTER JOIN announces USING (id) JOIN notes ON COALESCE(announces.object_id, statuses.id) = notes.id WHERE statuses.actor_id = $1 ORDER BY statuses.id DESC',
      values: [actorId]
    });

    return rows.map(row => new Status({
      repository: this,
      id: row.id,
      published: row.published,
      actorId,
      extension: parseExtension.call(this, row)
    }));
  },

  async selectRecentStatusesIncludingExtensionsAndActorsFromInbox(actorId) {
    const ids = await this.redis.client.zrevrange(
      `${this.redis.prefix}inbox:${actorId}`, 0, -1);

    const { rows } = await this.pg.query({
      name: 'selectRecentStatusesIncludingExtensionsAndActorsFromInbox',
      text: 'SELECT statuses.*, announces.object_id AS announce_object_id, notes.in_reply_to_id AS note_in_reply_to_id, notes.summary AS note_summary, notes.content AS note_content, actors.username AS actor_username, actors.host AS actor_host FROM statuses LEFT OUTER JOIN announces USING (id) JOIN notes ON COALESCE(announces.object_id, statuses.id) = notes.id JOIN actors ON statuses.actor_id = actors.id WHERE statuses.id = ANY($1)',
      values: [ids]
    });

    return ids.map(id => rows.find(row => row.id == id))
              .filter(Boolean)
              .map(row => new Status({
                repository: this,
                id: row.id,
                published: row.published,
                actor: new Actor({
                  repository: this,
                  id: row.actor_id,
                  username: row.actor_username,
                  host: row.actor_host || null
                }),
                extension: parseExtension.call(this, row)
              }));
  },

  async selectStatusById(id) {
    const { rows } = await this.pg.query({
      name: 'selectStatusById',
      text: 'SELECT actor_id FROM statuses WHERE id = $1',
      values: [id]
    });

    return rows[0] ? new Status({
      repository: this,
      id,
      published: rows[0].published,
      actorId: rows[0].actor_id
    }) : null;
  },

  async selectStatusIncludingExtensionById(id) {
    const { rows } = await this.pg.query({
      name: 'selectStatusIncludingExtensionById',
      text: 'SELECT statuses.*, announces.object_id AS announce_object_id, notes.summary AS note_summary, notes.content AS note_content FROM statuses LEFT OUTER JOIN announces USING (id) JOIN notes ON COALESCE(announces.object_id, statuses.id) = notes.id WHERE statuses.id = $1',
      values: [id]
    });

    return rows[0] ? new Status({
      repository: this,
      id,
      published: rows[0].published,
      actorId: rows[0].actor_id,
      extension: parseExtension.call(this, rows[0])
    }) : null;
  }
};
