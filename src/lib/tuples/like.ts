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
import { Like as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams from '../parsed_activitystreams';
import { temporaryError } from '../transfer';
import Repository from '../repository';
import Actor from './actor';
import Note from './note';
import Relation, { Reference } from './relation';

interface References {
  actor: Actor | null;
  object: Note | null;
}

type Properties = { id: string } &
({ actorId: string } | { actorId?: string; actor: Actor }) &
({ objectId: string } | { objectId?: string; object: Note });

export const unexpectedType = Symbol();

export interface Seed {
  readonly actor: Actor;
  readonly object: Note;
}

export default class Like extends Relation<Properties, References> {
  readonly id!: string;
  readonly actor?: Reference<Actor | null>;
  readonly actorId!: string;
  readonly object?: Reference<Note | null>;
  readonly objectId!: string;

  async toActivityStreams(recover: (error: Error) => unknown): Promise<ActivityStreams> {
    const note = await this.select('object');
    if (!note) {
      throw recover(new Error('object not found.'));
    }

    const status = await note.select('status');
    if (!status) {
      throw recover(new Error('object\'s status not found.'));
    }

    return { type: 'Like', object: await status.getUri(recover) };
  }

  static async create(repository: Repository, seed: Seed, recover: (error: Error) => unknown) {
    const [recipient, like] = await Promise.all([
      seed.object.select('status').then(status => {
        if (!status) {
          throw recover(new Error('object\'s status not found.'));
        }

        return status.select('actor');
      }),
      repository.insertLike(seed, recover)
    ]);

    if (!recipient) {
      throw recover(new Error('object\'s actor not found.'));
    }

    if (!seed.actor.host && recipient.host) {
      await repository.queue.add({ type: 'postLike', id: like.id }, { timeout: 16384 });
    }

    return like;
  }

  static async createFromParsedActivityStreams(repository: Repository, activity: ParsedActivityStreams, actor: Actor, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const type = await activity.getType(signal, recover);
    if (!type.has('Like')) {
      throw recover(Object.assign(new Error('Unsupported type. Expected Like.'), { [unexpectedType]: true }));
    }

    const object = await activity.getObject(signal, recover);
    if (!object) {
      throw recover(new Error('object unspecified.'));
    }

    const note = await Note.fromParsedActivityStreams(repository, object, null, signal, recover);
    if (!note) {
      throw recover(new Error('object not found.'));
    }

    return this.create(repository, { actor, object: note }, recover);
  }
}

Like.references = {
  actor: { query: Like.withRepository('selectActorById'), id: 'actorId' },
  object: { query: Like.withRepository('selectNoteById'), id: 'objectId' }
};
