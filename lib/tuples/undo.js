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
import Actor from './actor';
import Note from './note';

export default class {
  constructor(properties) {
    Object.assign(this, properties);
  }

  static async createFromParsedActivityStreams(repository, activity, actor) {
    const type = await activity.getType();

    if (!type.has('Undo')) {
      throw new TypeNotAllowed;
    }

    const object = await activity.getObject();
    const objectType = await object.getType();

    if (objectType.has('Announce')) {
      const uriEntity =
        await repository.selectAllocatedURI(await object.getId());

      await repository.deleteStatusByUriAndAttributedTo(uriEntity, actor);
    } else if (objectType.has('Follow')) {
      const objectActor = await Actor.fromParsedActivityStreams(
        repository, await object.getObject());

      await repository.deleteFollowByActorAndObject(actor, objectActor);
    } else if (objectType.has('Like')) {
      const note = await Note.fromParsedActivityStreams(
        repository, await object.getObject());

      await repository.deleteLikeByActorAndObject(actor, note);
    } else {
      throw new TypeNotAllowed;
    }

    return new this;
  }
}