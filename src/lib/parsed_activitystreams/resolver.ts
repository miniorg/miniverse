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

import { Custom as CustomError, Severity } from '../errors';
import Repository from '../repository';
import { fetch } from '../transfer';

interface Body {
  readonly [key: string]: unknown;
}

function find(ids: unknown[], context: unknown, body: unknown): { context: unknown; body: Body } | null {
  if (!(body instanceof Object)) {
    return null;
  }

  const indexer = body as Body;

  if (indexer['@context']) {
    context = indexer['@context'];
  }

  if (ids.includes(indexer.id)) {
    return { context, body };
  }

  for (const key in body) {
    if (key != '@context') {
      const found = find(ids, context, indexer[key]);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

export class CircularError extends CustomError {
  constructor(message: unknown, severity: Severity, originals: Error[] | null = null) {
    super(message, severity, originals);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export default class Resolver {
  private readonly unconsumedObjects: Map<unknown, Body | null>;

  constructor(iterable?: Iterable<[unknown, Body | null]>) {
    this.unconsumedObjects = iterable ? new Map(iterable) : new Map;
  }

  async resolve(repository: Repository, value: string) {
    let body = this.unconsumedObjects.get(value);

    if (body === null) {
      throw new CircularError(
        'Circular reference in Activity Streams. Possibly invalid Activty Streams?',
        'info');
    }

    const resolver = new Resolver(this.unconsumedObjects);
    resolver.unconsumedObjects.set(value, null);

    if (body) {
      return { resolver, context: body['@context'], body };
    }

    const response = await fetch(repository, value, {
      headers: { Accept: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"' }
    });

    body = await response.json();
    if (!body) {
      throw new CustomError('Empty body.', 'error');
    }

    const hashIndex = value.indexOf('#');

    if (hashIndex < 0) {
      if (body.id && body.id != value) {
        throw new CustomError(
          'Given id and id in Activity Streams mismatch. Possibly invalid id?',
          'info');
      }

      return { resolver, context: body['@context'], body };
    }

    const primary = value.slice(0, hashIndex);

    if (body.id && body.id != primary) {
      throw new CustomError(
        'Given id and id in Activity Streams mismatch. Possibly invalid id?',
        'info');
    }

    const fragment = value.slice(hashIndex);
    const found = find([value, fragment], body['@context'], body);

    if (found) {
      resolver.unconsumedObjects.set(primary, body);
      return { resolver, context: found.context, body: found.body };
    }

    throw new CustomError('Fragment not found. Possibly invalid id?', 'info');
  }
}
