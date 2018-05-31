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

import { domainToASCII } from 'url';
import Accept from './accept';
import Entity from './entity';

export class RemoteObjectError extends Error { }

export default class Follow extends Entity {
  async toActivityStreams() {
    const { actor, object } = await this.get();
    const [actorUri, objectUri] =
      await Promise.all([actor.getUri(), object.getUri()]);

    return { type: 'Follow', actor: actorUri, object: objectUri };
  }

  static async create(repository, actor, object) {
    const follow = new this(repository, null, { actor, object });

    await repository.insertFollow(follow);
    await Accept.create(repository, follow);

    return follow;
  }

  static async fromParsedActivityStreams(repository, actor, activity) {
    const localUserPrefix = `https://${domainToASCII(repository.host)}/@`;
    const object = await activity.getObject();
    const objectId = await object.getId();

    if (!objectId.startsWith(localUserPrefix)) {
      throw new RemoteObjectError;
    }

    const person = await repository.selectLocalPersonByUsername(
      decodeURIComponent(objectId.slice(localUserPrefix.length)));

    return this.create(repository, actor, person);
  }
}

Follow.query = 'loadFollowIncludingActorAndObject';
