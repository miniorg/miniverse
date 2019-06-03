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
import Like from '../tuples/like';
import Note from '../tuples/note';
import Repository from '.';

export default class {
  async deleteLikeByActorAndObject(this: Repository, actor: Actor, object: Note) {
    await this.pg.query({
      name: 'deleteLikeByActorAndObject',
      text: 'DELETE FROM likes WHERE actor_id = $1 AND object_id = $2',
      values: [actor.id, object.id]
    });
  }

  async insertLike(this: Repository, like: Like, recover: (error: Error) => unknown) {
    let result;

    try {
      result = await this.pg.query({
        name: 'insertLike',
        text: 'INSERT INTO likes (actor_id, object_id) VALUES ($1, $2) RETURNING id',
        values: [like.actorId, like.objectId]
      });
    } catch (error) {
      if (error.code == '23505') {
        throw recover(new Error('Already liked.'));
      }

      throw error;
    }

    like.id = result.rows[0].id;
  }

  async selectLikeById(this: Repository, id: string): Promise<Like | null> {
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
