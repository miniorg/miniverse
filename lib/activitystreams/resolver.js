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

import fetch from '../fetch';

function find(ids, object) {
  if (!(object instanceof Object)) {
    return null;
  }

  if (ids.includes(object.id)) {
    return object;
  }

  for (const key in object) {
    if (key != '@context') {
      const found = find(ids, object[key]);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

export class CircularError extends Error {}
export class NotFoundError extends Error {}

export default class {
  constructor(iterable) {
    this.unconsumedObjects = new Map(iterable);
  }

  async resolve(repository, value) {
    let object = this.unconsumedObjects.get(value);

    if (object === null) {
      throw new CircularError;
    }

    const resolver = new this.constructor(this.unconsumedObjects);
    resolver.unconsumedObjects.set(value, null);

    if (object) {
      return { resolver, object };
    }

    const response = await fetch(repository, value, {
      headers: { Accept: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"' }
    });

    object = await response.json();
    const hashIndex = value.indexOf('#');

    if (hashIndex < 0) {
      return { resolver, object };
    }

    resolver.unconsumedObjects.set(value.slice(0, hashIndex), object);
    object = find([value, value.slice(hashIndex)], object);

    if (object) {
      return { resolver, object };
    }

    throw new NotFoundError;
  }
}
