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
import { Like as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams, { TypeNotAllowed } from '../parsed_activitystreams';
import Repository from '../repository';
import Actor from './actor';
import Note from './note';
import Relation, { Reference } from './relation';

interface References {
  actor: Actor | null;
  object: Note | null;
}

type Properties = { id?: string } &
({ actorId: string } | { actorId?: string; actor: Actor }) &
({ objectId: string } | { objectId?: string; object: Note });

export default class Like extends Relation<Properties, References> {
  id?: string;
  readonly actor?: Reference<Actor | null>;
  readonly actorId!: string;
  readonly object?: Reference<Note | null>;
  readonly objectId!: string;

  async toActivityStreams(): Promise<ActivityStreams> {
    const note = await this.select('object');
    if (!note) {
      throw new CustomError('The object cannot be fetched.', 'error');
    }

    const status = await note.select('status');
    if (!status) {
      throw new CustomError('The object\'s status cannot be fetched.', 'error');
    }

    return { type: 'Like', object: await status.getUri() };
  }

  static async create(repository: Repository, actor: Actor, object: Note) {
    const like = new this({ actor, object, repository });

    const [recipient] = await Promise.all([
      object.select('status').then(status => {
        if (!status) {
          throw new CustomError('The status cannot be fetched.', 'error');
        }

        return status.select('actor');
      }),
      repository.insertLike(like)
    ]);

    if (!recipient) {
      throw new CustomError('The actor who the status is attributed to cannot be fetched', 'error');
    }

    if (!actor.host && recipient.host) {
      await repository.queue.add({ type: 'postLike', id: like.id });
    }

    return like;
  }

  static async createFromParsedActivityStreams(repository: Repository, activity: ParsedActivityStreams, actor: Actor) {
    const type = await activity.getType();
    if (!type.has('Like')) {
      throw new TypeNotAllowed('Unexpected type. Expected Like.', 'info');
    }

    const object = await activity.getObject();
    if (!object) {
      throw new CustomError('Object unspecified.', 'error');
    }

    const note = await Note.fromParsedActivityStreams(repository, object);
    if (!note) {
      throw new CustomError('The object cannot be fetched.', 'error');
    }

    return this.create(repository, actor, note);
  }
}

Like.references = {
  actor: { query: Like.withRepository('selectActorById'), id: 'actorId' },
  object: { query: Like.withRepository('selectNoteById'), id: 'objectId' }
};
