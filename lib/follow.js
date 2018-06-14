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

import Accept from './accept';
import Person from './person';
import Relation, { withRepository } from './relation';

export default class Follow extends Relation {
  async toActivityStreams() {
    const [actor, object] = await Promise.all([
      this.select('actor').then(person => person.getUri()),
      this.select('object').then(person => person.getUri())
    ]);

    return { type: 'Follow', actor, object };
  }

  static async create(repository, actor, object) {
    const follow = new this({ actor, object, repository });

    await repository.insertFollow(follow);

    await Promise.all([
      Accept.create(repository, follow),
      !actor.host && object.host && repository.queue.add({
        type: 'postFollow',
        id: follow.id
      })
    ]);

    return follow;
  }

  static async fromParsedActivityStreams(repository, activity, actor) {
    const object = await activity.getObject();
    const person = await Person.fromParsedActivityStreams(repository, object);

    return this.create(repository, actor, person);
  }
}

Follow.references = {
  actor: { query: withRepository('selectPersonById'), id: 'actorId' },
  object: { query: withRepository('selectPersonById'), id: 'objectId' }
};
