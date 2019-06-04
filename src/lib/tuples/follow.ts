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

import { AbortSignal } from 'abort-controller';
import { Follow as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams from '../parsed_activitystreams';
import Repository from '../repository';
import { temporaryError } from '../transfer';
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

export const unexpectedType = Symbol();

export default class Follow extends Relation<Properties, References> {
  id?: string;
  readonly actor?: Reference<Actor | null>;
  readonly actorId!: string;
  readonly object?: Reference<Actor | null>;
  readonly objectId!: string;

  async toActivityStreams(recover: (error: Error) => unknown): Promise<ActivityStreams> {
    const [actor, object] = await Promise.all([
      this.select('actor').then(actor => {
        if (!actor) {
          throw recover(new Error('actor not found.'));
        }

        return actor.getUri(recover);
      }),
      this.select('object').then(actor => {
        if (!actor) {
          throw recover(new Error('object not found.'));
        }

        return actor.getUri(recover);
      })
    ]);

    if (!actor) {
      throw recover(new Error('actor\'s uri not found.'));
    }

    if (!object) {
      throw recover(new Error('object\'s uri not found.'));
    }

    return { type: 'Follow', actor, object };
  }

  static async create(repository: Repository, actor: Actor, object: Actor, recover: (error: Error) => unknown) {
    const follow = new this({ actor, object, repository });

    await repository.insertFollow(follow, recover);

    await Promise.all([
      Accept.create(repository, follow, recover),
      !actor.host && object.host && repository.queue.add({
        type: 'postFollow',
        id: follow.id
      }, { timeout: 16384 })
    ] as unknown[]);

    return follow;
  }

  static async createFromParsedActivityStreams(repository: Repository, activity: ParsedActivityStreams, actor: Actor, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const type = await activity.getType(signal, recover);
    if (!type.has('Follow')) {
      throw recover(Object.assign(new Error('Unsupported type. Expected Follow.'), { [unexpectedType]: true }));
    }

    const object = await activity.getObject(signal, recover);
    if (!object) {
      throw recover(new Error('object unspecified.'));
    }

    const objectActor =
      await Actor.fromParsedActivityStreams(repository, object, signal, recover);
    if (!objectActor) {
      throw recover(new Error('object\'s actor unfetched.'));
    }

    return this.create(repository, actor, objectActor, recover);
  }
}

Follow.references = {
  actor: { query: Follow.withRepository('selectActorById'), id: 'actorId' },
  object: { query: Follow.withRepository('selectActorById'), id: 'objectId' }
};
