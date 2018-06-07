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

export default class Relation {
  constructor(properties) {
    Object.assign(this, properties);

    for (const key in this.constructor.references) {
      if (this[key]) {
        this[this.constructor.references[key].id] = this[key].id;

        if (this.constructor.references[key].inverseOf) {
          this[key][this.constructor.references[key].inverseOf] = this;
        }
      }
    }
  }

  async select(key) {
    if (this[key]) {
      return this[key];
    }

    this[key] = this.constructor.references[key].query(this);
    const queried = await this[key];

    if (this.constructor.references[key].inverseOf) {
      queried[this.constructor.references[key].inverseOf] = this;
    }

    return queried;
  }
}

export function withRepository(query) {
  return function(instance) {
    return instance.repository[query](instance[this.id]);
  };
}
