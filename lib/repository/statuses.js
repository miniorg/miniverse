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

import Announce from '../announce';
import Note from '../note';
import Person from '../person';
import Status from '../status';

function parseExtension({ id, announce_object_id, note_content }) {
  return announce_object_id ? new Announce({
    repository: this,
    id,
    object: new Note({
      repository: this,
      id: announce_object_id,
      content: note_content
    })
  }) : new Note({
    repository: this,
    id,
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

  async selectRecentStatusesIncludingExtensionsByPersonId(personId) {
    const { rows } = await this.pg.query({
      name: 'selectRecentStatusesIncludingExtensionsByPersonId',
      text: 'SELECT statuses.*, announces.object_id AS announce_object_id, notes.content AS note_content FROM statuses LEFT OUTER JOIN announces USING (id) JOIN notes ON COALESCE(announces.object_id, statuses.id) = notes.id WHERE statuses.person_id = $1 ORDER BY statuses.id DESC',
      values: [personId]
    });

    return rows.map(row => new Status({
      repository: this,
      id: row.id,
      personId,
      extension: parseExtension.call(this, row)
    }));
  },

  async selectRecentStatusesIncludingExtensionsAndPersonsFromInbox(personId) {
    const ids = await this.redis.client.zrevrange(
      `${this.redis.prefix}inbox:${personId}`, 0, -1);

    const { rows } = await this.pg.query({
      name: 'selectRecentStatusesIncludingExtensionsAndPersonsFromInbox',
      text: 'SELECT statuses.*, announces.object_id AS announce_object_id, notes.content AS note_content, persons.username AS person_username, persons.host AS person_host FROM statuses LEFT OUTER JOIN announces USING (id) JOIN notes ON COALESCE(announces.object_id, statuses.id) = notes.id JOIN persons ON statuses.person_id = persons.id WHERE statuses.id = ANY($1) ORDER BY statuses.id DESC',
      values: [ids]
    });

    return ids.map(id => rows.find(row => row.id == id))
              .filter(Boolean)
              .map(row => new Status({
                repository: this,
                id: row.id,
                person: new Person({
                  repository: this,
                  id: row.person_id,
                  username: row.person_username,
                  host: row.person_host || null
                }),
                extension: parseExtension.call(this, row)
              }));
  },

  async selectStatusById(id) {
    const { rows } = await this.pg.query({
      name: 'selectStatusById',
      text: 'SELECT person_id FROM statuses WHERE id = $1',
      values: [id]
    });

    return rows[0] ?
      new Status({ repository: this, id, personId: rows[0].person_id }) : null;
  },

  async selectStatusIncludingExtensionById(id) {
    const { rows } = await this.pg.query({
      name: 'selectStatusIncludingExtensionById',
      text: 'SELECT statuses.*, announces.object_id AS announce_object_id, notes.content AS note_content FROM statuses LEFT OUTER JOIN announces USING (id) JOIN notes ON COALESCE(announces.object_id, statuses.id) = notes.id WHERE statuses.id = $1',
      values: [id]
    });

    return rows[0] ? new Status({
      repository: this,
      id,
      personId: rows[0].person_id,
      extension: parseExtension.call(this, rows[0])
    }) : null;
  }
};
