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

import Relation, { withRepository } from './relation';

export default class Accept extends Relation {
  async toActivityStreams() {
    const object = await this.select('object');

    return {
      type: 'Accept',
      object: await object.toActivityStreams()
    };
  }

  static async create(repository, object) {
    const accept = new this({ object, repository });
    const [objectActor, objectObject] =
      await Promise.all([object.select('actor'), object.select('object')]);

    if (!objectObject.host && objectActor.host) {
      await repository.queue.add({ type: 'accept', objectId: object.id });
    }

    return accept;
  }
}

Accept.references = {
  object: {
    query: withRepository('selectFollowIncludingActorAndObjectById'),
    id: 'objectId'
  }
};
