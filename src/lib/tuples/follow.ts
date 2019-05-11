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

import { Custom as CustomError } from '../errors';
import { Follow as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams, { TypeNotAllowed } from '../parsed_activitystreams';
import Repository from '../repository';
import Accept from './accept';
import Actor from './actor';
import Relation, { Reference } from './relation';

type Properties = { id?: string } &
({ actorId: string } | { actorId?: string; actor: Actor }) &
({ objectId: string } | { objectId?: string; object: Actor });

interface References {
  actor: Actor | null;
  object: Actor | null;
}

export default class Follow extends Relation<Properties, References> {
  id?: string;
  readonly actor?: Reference<Actor | null>;
  readonly actorId!: string;
  readonly object?: Reference<Actor | null>;
  readonly objectId!: string;

  async toActivityStreams(): Promise<ActivityStreams> {
    const [actor, object] = await Promise.all([
      this.select('actor').then(actor => {
        if (!actor) {
          throw new CustomError('Actor not found.', 'error');
        }

        return actor.getUri();
      }),
      this.select('object').then(actor => {
        if (!actor) {
          throw new CustomError('Object not found.', 'error');
        }

        return actor.getUri();
      })
    ]);

    if (!actor) {
      throw new CustomError('Actor URI not found.', 'error');
    }

    if (!object) {
      throw new CustomError('Object URI not found.', 'error');
    }

    return { type: 'Follow', actor, object };
  }

  static async create(repository: Repository, actor: Actor, object: Actor) {
    const follow = new this({ actor, object, repository });

    await repository.insertFollow(follow);

    await Promise.all([
      Accept.create(repository, follow),
      !actor.host && object.host && repository.queue.add({
        type: 'postFollow',
        id: follow.id
      })
    ] as unknown[]);

    return follow;
  }

  static async createFromParsedActivityStreams(repository: Repository, activity: ParsedActivityStreams, actor: Actor) {
    const type = await activity.getType();
    if (!type.has('Follow')) {
      throw new TypeNotAllowed('Unexpected type. Expected Follow.', 'info');
    }

    const object = await activity.getObject();
    if (!object) {
      throw new CustomError('object unspecified.', 'error');
    }

    const objectActor =
      await Actor.fromParsedActivityStreams(repository, object);
    if (!objectActor) {
      throw new CustomError('The object cannot be fetched.', 'error');
    }

    return this.create(repository, actor, objectActor);
  }
}

Follow.references = {
  actor: { query: Follow.withRepository('selectActorById'), id: 'actorId' },
  object: { query: Follow.withRepository('selectActorById'), id: 'objectId' }
};
