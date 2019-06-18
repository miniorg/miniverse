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
import ParsedActivityStreams from '../parsed_activitystreams';
import Repository from '../repository';
import Actor from './actor';
import Note from './note';
import { temporaryError } from '../transfer';

export const unexpectedType = Symbol();

export default class Undo {
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

    if (!type.has('Undo')) {
      throw recover(Object.assign(new Error('Unsupported type. Expected Undo.'), { [unexpectedType]: true }));
    }

    const object = await activity.getObject(signal, recover);
    if (!object) {
      throw recover(new Error('object unspecified.'));
    }

    const objectType = await object.getType(signal, recover);

    if (objectType.has('Announce')) {
      const id = await object.getId(recover);
      if (typeof id != 'string') {
        throw recover(new Error('Unsupported id type.'));
      }

      const uriEntity = await repository.selectAllocatedURI(id, signal, recover);
      if (!uriEntity) {
        throw recover(new Error('uri not found.'));
      }

      await repository.deleteStatusByUriAndAttributedTo(uriEntity, actor, signal, recover);
    } else if (objectType.has('Follow')) {
      const objectActorActivityStreams = await object.getObject(signal, recover);
      if (!objectActorActivityStreams) {
        throw recover(new Error('object\'s object unspecified.'));
      }

      const objectActor = await Actor.fromParsedActivityStreams(
        repository, objectActorActivityStreams, signal, recover);
      if (!objectActor) {
        throw recover(new Error('object\'s actor not found.'));
      }

      await repository.deleteFollowByActorAndObject(actor, objectActor, signal, recover);
    } else if (objectType.has('Like')) {
      const noteActivityStreams = await object.getObject(signal, recover);
      if (!noteActivityStreams) {
        throw recover(new Error('object\'s object unspecified.'));
      }

      const note = await Note.fromParsedActivityStreams(
        repository, noteActivityStreams, null, signal, recover);
      if (!note) {
        throw recover(new Error('object\'s object not found.'));
      }

      await repository.deleteLikeByActorAndObject(actor, note, signal, recover);
    } else {
      throw recover(new Error('Unsupported object type. Expected Announce, Follow or Like.'));
    }

    return new this;
  }
}
