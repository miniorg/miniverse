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

import { TypeNotAllowed } from './parsed_activitystreams';
import Note from './note';
import Person from './person';

export default class {
  constructor(properties) {
    Object.assign(this, properties);
  }

  static async fromParsedActivityStreams(repository, activity, actor) {
    const object = await activity.getObject();
    const type = await object.getType();

    if (type.has('Announce')) {
      const uriEntity = await repository.selectURI(await object.getId());
      await repository.deleteStatusByUriAndAttributedTo(uriEntity, actor);
    } else if (type.has('Follow')) {
      const person = await Person.fromParsedActivityStreams(
        repository, await object.getObject());

      await repository.deleteFollowByActorAndObject(actor, person);
    } else if (type.has('Like')) {
      const note = await Note.fromParsedActivityStreams(
        repository, await object.getObject());

      await repository.deleteLikeByActorAndObject(actor, note);
    } else {
      throw new TypeNotAllowed;
    }

    return new this;
  }
}
