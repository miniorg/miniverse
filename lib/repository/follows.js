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

import LocalPerson from '../local_person';
import Person from '../person';
import RemotePerson from '../remote_person';

function parsePerson(id, username, host) {
  return new Person(this, id, {
    extension: new (host ? RemotePerson : LocalPerson)(this, id),
    username,
    host: host || null
  });
}

export default {
  deleteFollowByActorAndObject(actor, object) {
    return this.pg.query({
      name: 'deleteFollow',
      text: 'DELETE FROM follows WHERE actor_id = $1 AND object_id = $2',
      values: [actor.id, object.id]
    });
  },

  async insertFollow(follow) {
    const { actor, object } = await follow.get();
    const { rows } = await this.pg.query({
      name: 'insertFollow',
      text: 'INSERT INTO follows (actor_id, object_id) SELECT actors.id, objects.id FROM persons AS actors, persons AS objects WHERE actors.id = $1 AND objects.id = $2 RETURNING id',
      values: [actor.id, object.id]
    });

    follow.id = rows[0].id;
  },

  async loadFollowIncludingActorAndObject(follow) {
    const { rows } = await this.pg.query({
      name: 'loadFollowIncludingActorAndObject',
      text: 'SELECT actors.id AS actor_id, actors.username AS actor_username, actors.host AS actor_host, objects.id AS object_id, objects.username AS object_username, objects.host AS object_host FROM follows JOIN persons AS actors ON actors.id = follows.actor_id JOIN persons AS objects ON objects.id = follows.object_id WHERE follows.id = $1',
      values: [follow.id]
    });

    return {
      actor: parsePerson.call(
        this,
        rows[0].actor_id,
        rows[0].actor_username,
        rows[0].actor_host),

      object: parsePerson.call(
        this,
        rows[0].object_id.toString(),
        rows[0].object_username,
        rows[0].object_host)
    };
  }
};
