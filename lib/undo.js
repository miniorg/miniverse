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
import Person from './person';

export default class {
  constructor(properties) {
    Object.assign(this, properties);
  }

  static async fromParsedActivityStreams(repository, actor, activity) {
    const object = await activity.getObject();
    const [objectObject] = await Promise.all([
      object.getObject()
            .then(Person.fromParsedActivityStreams.bind(Person, repository)),
      object.getType().then(type => {
        if (!type.has('Follow')) {
          throw new TypeNotAllowed;
        }
      })
    ]);

    await repository.deleteFollowByActorAndObject(actor, objectObject);

    return new this;
  }
}
