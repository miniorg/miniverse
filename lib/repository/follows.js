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
import Follow from '../tuples/follow';
import Base from './base';

export default class extends Base {
  async deleteFollowByActorAndObject(actor, object) {
    const { rowCount } = await this.pg.query({
      name: 'deleteFollow',
      text: 'DELETE FROM follows WHERE actor_id = $1 AND object_id = $2',
      values: [actor.id, object.id]
    });

    if (rowCount <= 0) {
      throw new Error;
    }
  }

  async insertFollow(follow) {
    const { rows } = await this.pg.query({
      name: 'insertFollow',
      text: 'INSERT INTO follows (actor_id, object_id) VALUES ($1, $2) RETURNING id',
      values: [follow.actor.id, follow.object.id]
    });

    follow.id = rows[0].id;
  }

  async selectFollowIncludingActorAndObjectById(id) {
    const { rows } = await this.pg.query({
      name: 'selectFollowIncludingActorAndObjectById',
      text: 'SELECT actors.id AS actor_id, actors.username AS actor_username, actors.host AS actor_host, actors.name AS actor_name, actors.summary AS actor_summary, objects.id AS object_id, objects.username AS object_username, objects.host AS object_host, objects.name AS object_name, objects.summary AS object_summary FROM follows JOIN actors ON actors.id = follows.actor_id JOIN actors AS objects ON objects.id = follows.object_id WHERE follows.id = $1',
      values: [id]
    });

    return new Follow({
      repository: this,
      id,
      actor: new Actor({
        repository: this,
        id: rows[0].actor_id,
        username: rows[0].actor_username,
        host: rows[0].actor_host || null,
        name: rows[0].actor_name,
        summary: rows[0].actor_summary
      }),
      object: new Actor({
        repository: this,
        id: rows[0].object_id,
        username: rows[0].object_username,
        host: rows[0].object_host || null,
        name: rows[0].object_name,
        summary: rows[0].object_summary
      })
    });
  }
}
