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

export default class {
  constructor(properties) {
    Object.assign(this, properties);
  }

  async selectFollowByObject() {
    await this.repository.loadFollowIncludingActorAndObject(this.object);
    return this.object;
  }

  async toActivityStreams() {
    await this.repository.loadFollowIncludingActorAndObject(this.object);

    return {
      type: 'Accept',
      object: await this.object.toActivityStreams()
    };
  }

  static async create(repository, object) {
    const accept = new this({ object, repository });
    const [objectActor, objectObject] = await Promise.all([
      object.selectPersonByActor(),
      object.selectPersonByObject()
    ]);

    if (!objectObject.host && objectActor.host) {
      await repository.queue.add({ type: 'accept', id: object.id });
    }

    return accept;
  }
}
