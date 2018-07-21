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

import { TypeNotAllowed } from '../parsed_activitystreams';
import Accept from './accept';
import Actor from './actor';
import Relation, { withRepository } from './relation';

export default class Follow extends Relation {
  async toActivityStreams() {
    const [actor, object] = await Promise.all([
      this.select('actor').then(actor => actor.getUri()),
      this.select('object').then(actor => actor.getUri())
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

  static async createFromParsedActivityStreams(repository, activity, actor) {
    const type = await activity.getType();
    if (!type.has('Follow')) {
      throw new TypeNotAllowed;
    }

    const object = await activity.getObject();
    const objectActor =
      await Actor.fromParsedActivityStreams(repository, object);

    return this.create(repository, actor, objectActor);
  }
}

Follow.references = {
  actor: { query: withRepository('selectActorById'), id: 'actorId' },
  object: { query: withRepository('selectActorById'), id: 'objectId' }
};
