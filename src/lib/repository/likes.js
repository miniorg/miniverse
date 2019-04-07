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

import Like from '../tuples/like';
import Base from './base';

export default class extends Base {
  async deleteLikeByActorAndObject(actor, object) {
    await this.pg.query({
      name: 'deleteLikeByActorAndObject',
      text: 'DELETE FROM likes WHERE actor_id = $1 AND object_id = $2',
      values: [actor.id, object.id]
    });
  }

  async insertLike(like) {
    const { rows } = await this.pg.query({
      name: 'insertLike',
      text: 'INSERT INTO likes (actor_id, object_id) VALUES ($1, $2) RETURNING id',
      values: [like.actorId, like.objectId]
    });

    like.id = rows[0].id;
  }

  async selectLikeById(id) {
    const { rows } = await this.pg.query({
      name: 'selectLikeById',
      text: 'SELECT * FROM likes WHERE id = $1',
      values: [id]
    });

    return rows[0] ? new Like({
      repository: this,
      id,
      actorId: rows[0].actor_id,
      objectId: rows[0].object_id
    }) : null;
  }
}
