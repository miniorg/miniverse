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
import ParsedActivityStreams, { TypeNotAllowed } from '../parsed_activitystreams';
import Repository from '../repository';
import Actor from './actor';
import Note from './note';

export default class Undo {
  static async createFromParsedActivityStreams(repository: Repository, activity: ParsedActivityStreams, actor: Actor) {
    const type = await activity.getType();

    if (!type.has('Undo')) {
      throw new TypeNotAllowed('Unexpected type. Expected Note.', 'info');
    }

    const object = await activity.getObject();
    if (!object) {
      throw new CustomError('Object unspecified.', 'error');
    }

    const objectType = await object.getType();

    if (objectType.has('Announce')) {
      const id = await object.getId();
      if (typeof id != 'string') {
        throw new CustomError('Invalid id.', 'error');
      }

      const uriEntity = await repository.selectAllocatedURI(id);
      if (!uriEntity) {
        throw new CustomError('URI not found.', 'error');
      }

      await repository.deleteStatusByUriAndAttributedTo(uriEntity, actor);
    } else if (objectType.has('Follow')) {
      const objectActorActivityStreams = await object.getObject();
      if (!objectActorActivityStreams) {
        throw new CustomError('object\'s object unspecified.', 'error');
      }

      const objectActor = await Actor.fromParsedActivityStreams(
        repository, objectActorActivityStreams);
      if (!objectActor) {
        throw new CustomError('Object\'s actor not found', 'error');
      }

      await repository.deleteFollowByActorAndObject(actor, objectActor);
    } else if (objectType.has('Like')) {
      const noteActivityStreams = await object.getObject();
      if (!noteActivityStreams) {
        throw new CustomError('object\'s object unspecified.', 'error');
      }

      const note = await Note.fromParsedActivityStreams(
        repository, noteActivityStreams);
      if (!note) {
        throw new CustomError('Object not found', 'error');
      }

      await repository.deleteLikeByActorAndObject(actor, note);
    } else {
      throw new TypeNotAllowed(
        'Unexpected type. Expected Announce, Follow, or Like.',
        'info');
    }

    return new this;
  }
}
