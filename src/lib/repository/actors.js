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

import Actor from '../tuples/actor';
import Base from './base';

function parse({ id, username, host, name, summary }) {
  return new Actor({
    repository: this,
    id,
    username,
    host: host || null,
    name,
    summary
  });
}

export default class extends Base {
  async selectActorById(id) {
    const { rows } = await this.pg.query({
      name: 'selectActorById',
      text: 'SELECT * FROM actors WHERE id = $1',
      values: [id]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  }

  async selectActorByUsernameAndNormalizedHost(username, normalizedHost) {
    const { rows } = await this.pg.query({
      name: 'selectActorByUsernameAndNormalizedHost',
      text: 'SELECT * FROM actors WHERE username = $1 AND lower(host) = $2',
      values: [username, normalizedHost || '']
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  }

  async selectActorsByFolloweeId(id) {
    const { rows } = await this.pg.query({
      name: 'selectActorsByFollowee',
      text: 'SELECT actors.* FROM actors JOIN follows ON actors.id = follows.actor_id WHERE follows.object_id = $1',
      values: [id]
    });

    return rows.map(parse, this);
  }

  async selectActorsMentionedByNoteId(id) {
    const { rows } = await this.pg.query({
      name: 'selectActorsMentionedByNoteId',
      text: 'SELECT actors.* FROM actors JOIN mentions ON actors.id = mentions.href_id WHERE mentions.note_id = $1',
      values: [id]
    });

    return rows.map(parse, this);
  }
}
