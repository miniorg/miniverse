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

import fetch from '../transfer/fetch';

function find(ids, context, body) {
  if (!(body instanceof Object)) {
    return null;
  }

  if (body['@context']) {
    context = body['@context'];
  }

  if (ids.includes(body.id)) {
    return { context, body };
  }

  for (const key in body) {
    if (key != '@context') {
      const found = find(ids, context, body[key]);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

export class CircularError extends Error {}

export default class {
  constructor(iterable) {
    this.unconsumedObjects = new Map(iterable);
  }

  async resolve(repository, value) {
    let body = this.unconsumedObjects.get(value);

    if (body === null) {
      throw new CircularError;
    }

    const resolver = new this.constructor(this.unconsumedObjects);
    resolver.unconsumedObjects.set(value, null);

    if (body) {
      return { resolver, context: body['@context'], body };
    }

    const response = await fetch(repository, value, {
      headers: { Accept: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"' }
    });

    body = await response.json();
    const hashIndex = value.indexOf('#');

    if (hashIndex < 0) {
      if (body.id && body.id != value) {
        throw new Error;
      }

      return { resolver, context: body['@context'], body };
    }

    const primary = value.slice(0, hashIndex);

    if (body.id && body.id != primary) {
      throw new Error;
    }

    const fragment = value.slice(hashIndex);
    const found = find([value, fragment], body['@context'], body);

    if (found) {
      resolver.unconsumedObjects.set(primary, body);
      return { resolver, context: found.context, body: found.body };
    }

    throw new Error;
  }
}
