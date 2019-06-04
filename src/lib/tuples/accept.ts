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

import { Accept as ActivityStreams } from '../generated_activitystreams';
import Follow from './follow';
import Relation, { Reference } from './relation';
import Repository from '../repository';

interface References {
  object: Follow | null;
}

type Properties = { objectId: string } | { objectId?: string; object: Follow };

export default class Accept extends Relation<Properties, References> {
  readonly object?: Reference<Follow | null>;
  readonly objectId!: string;

  async toActivityStreams(recover: (error: Error) => unknown): Promise<ActivityStreams> {
    const object = await this.select('object');

    if (!object) {
      throw recover(new Error('object not found.'));
    }

    return {
      type: 'Accept',
      object: await object.toActivityStreams(recover)
    };
  }

  static async create(repository: Repository, object: Follow, recover: (error: Error) => unknown) {
    const accept = new this({ object, repository });
    const [objectActor, objectObject] =
      await Promise.all([object.select('actor'), object.select('object')]);

    if (!objectActor) {
      throw recover(new Error('object\'s actor not found.'));
    }

    if (!objectObject) {
      throw recover(new Error('object\'s object not found.'));
    }

    if (!objectObject.host && objectActor.host) {
      await repository.queue.add({ type: 'accept', objectId: object.id }, { timeout: 16384 });
    }

    return accept;
  }
}

Accept.references = {
  object: {
    query: Accept.withRepository('selectFollowIncludingActorAndObjectById'),
    id: 'objectId'
  }
};
