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

type Properties = { id: string } &
({ actorId: string } | { actorId?: string; actor: Actor }) &
({ objectId: string } | { objectId?: string; object: Actor });

interface References {
  actor: Actor | null;
  object: Actor | null;
}

export const unexpectedType = Symbol();

export interface Seed {
  readonly actor: Actor;
  readonly object: Actor;
}

export default class Follow extends Relation<Properties, References> {
  readonly id!: string;
  readonly actor?: Reference<Actor | null>;
  readonly actorId!: string;
  readonly object?: Reference<Actor | null>;
  readonly objectId!: string;

  async toActivityStreams(
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ): Promise<ActivityStreams> {
    const [actor, object] = await Promise.all([
      this.select('actor', signal, recover).then(actor => {
        if (!actor) {
          throw recover(new Error('actor not found.'));
        }

        return actor.getUri(signal, recover);
      }),
      this.select('object', signal, recover).then(actor => {
        if (!actor) {
          throw recover(new Error('object not found.'));
        }

        return actor.getUri(signal, recover);
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

  static async create(
    repository: Repository,
    seed: Seed,
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ) {
    const follow = await repository.insertFollow(seed, signal, recover);

    await Promise.all([
      Accept.create(repository, follow, signal, recover),
      !seed.actor.host && seed.object.host && repository.queue.add({
        type: 'postFollow',
        id: follow.id
      }, { timeout: 16384 })
    ] as unknown[]);

    return follow;
  }

  static async createFromParsedActivityStreams(
    repository: Repository,
    activity: ParsedActivityStreams,
    actor: Actor,
    signal: AbortSignal,
    recover: (error: Error & {
      name?: string;
      [temporaryError]?: boolean;
      [unexpectedType]?: boolean;
    }) => unknown
  ) {
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

    return this.create(repository, {
      actor,
      object: objectActor
    }, signal, recover);
  }
}

Follow.references = {
  actor: { query: Follow.withRepository('selectActorById'), id: 'actorId' },
  object: { query: Follow.withRepository('selectActorById'), id: 'objectId' }
};
