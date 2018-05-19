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

import Person from '../person';

export default {
  async insertFollow(follow) {
    const { rows } = await this.pg.query({
      name: 'insertFollow',
      text: 'INSERT INTO follows (actor_id, object_id) VALUES ($1, $2) RETURNING id',
      values: [follow.actor.id, follow.object.id]
    });

    follow.id = rows[0].id;
    this.loadeds.add(follow);
  },

  async loadFollowIncludingActorAndObject(follow) {
    if (this.loadeds.has(follow)) {
      return;
    }

    const { rows } = await this.pg.query({
      name: 'loadFollowIncludingActorAndObject',
      text: 'SELECT actors.id AS actor_id, actors.username AS actor_username, actors.host AS actor_host, objects.id AS object_id, objects.username AS object_username, objects.host AS object_host FROM follows JOIN persons AS actors ON actors.id = follows.actor_id JOIN persons AS objects ON objects.id = follows.object_id WHERE follows.id = $1',
      values: [follow.id]
    });

    follow.actor = new Person({
      repository: this,
      id: rows[0].actor_id,
      username: rows[0].actor_username,
      host: rows[0].actor_host || null
    });

    follow.object = new Person({
      repository: this,
      id: rows[0].object_id,
      username: rows[0].object_username,
      host: rows[0].object_host || null
    });

    this.loadeds.add(follow.actor);
    this.loadeds.add(follow.object);
    this.loadeds.add(follow);
  }
};
