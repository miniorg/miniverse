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
import Note from './note';
import Relation, { withRepository } from './relation';

export default class Like extends Relation {
  async toActivityStreams() {
    const note = await this.select('object');
    const status = await note.select('status');

    return { type: 'Like', object: await status.getUri() };
  }

  static async create(repository, actor, object) {
    const like = new this({ actor, object, repository });

    const [recipient] = await Promise.all([
      object.select('status').then(status => status.select('actor')),
      repository.insertLike(like)
    ]);

    if (!actor.host && recipient.host) {
      await repository.queue.add({ type: 'postLike', id: like.id });
    }

    return like;
  }

  static async createFromParsedActivityStreams(repository, activity, actor) {
    const type = await activity.getType();
    if (!type.has('Like')) {
      throw new TypeNotAllowed('Unexpected type. Expected Like.', 'info');
    }

    const object = await activity.getObject();
    const note = await Note.fromParsedActivityStreams(repository, object);

    return this.create(repository, actor, note);
  }
}

Like.references = {
  actor: { query: withRepository('selectActorById'), id: 'actorId' },
  object: { query: withRepository('selectNoteById'), id: 'objectId' }
};
