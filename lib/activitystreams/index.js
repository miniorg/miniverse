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

import { URL } from 'url';
import Follow from '../follow';
import Note from '../note';
import URI from '../uri';
import Resolver from './resolver';

const resolvers = new WeakMap;

function load(repository) {
  if (typeof this.body == 'string') {
    this.body = resolvers.get(this).resolve(repository, this.body).then(
      ({ resolver, object }) => {
        resolvers.set(this, resolver);
        return object;
      });
  }

  return this.body;
}

function getChild(body) {
  return body &&
    new this.constructor(body, this.normalizedHost, resolvers.get(this));
}

export const AnyHost = {};
export const NoHost = {};
export class TypeNotAllowed extends Error {}

export default class {
  constructor(body, normalizedHost, resolver = new Resolver) {
    if (body instanceof Object) {
      if (body.id) {
        const url = new URL(body.id);

        this.normalizedHost = URI.normalizeHost(url.host);
        this.body = [AnyHost, this.normalizedHost].includes(normalizedHost) ?
          Promise.resolve(body) : body.id;
      } else {
        this.body = Promise.resolve(body);
        this.normalizedHost = normalizedHost;
      }
    } else {
      const url = new URL(body);

      this.body = body;
      this.normalizedHost = URI.normalizeHost(url.host);
    }

    resolvers.set(this, resolver);
  }

  async getActor(repository) {
    const { actor } = await load.call(this, repository);
    return getChild.call(this, actor);
  }

  async getAttributedTo(repository) {
    const { attributedTo } = await load.call(this, repository);
    return getChild.call(this, attributedTo);
  }

  async getContent(repository) {
    const { content } = await load.call(this, repository);
    return content;
  }

  async getItems(repository) {
    const getChildOfThis = getChild.bind(this);
    const [body, type] = await Promise.all([
       load.call(this, repository),
       this.getType(repository)
    ]);

    if (type.has('OrderedCollection')) {
      return body.orderedItems.map(getChildOfThis);
    }

    if (type.has('Collection')) {
      return body.items.map(getChildOfThis);
    }

    if (Array.isArray(body)) {
      return body.map(getChildOfThis);
    }

    return [this];
  }

  async getId() {
    return typeof this.body == 'string' ? this.body : (await this.body).id;
  }

  async getInbox(repository) {
    const { inbox } = await load.call(this, repository);
    return getChild.call(this, inbox);
  }

  async getObject(repository) {
    const { object } = await load.call(this, repository);
    return getChild.call(this, object);
  }

  async getPreferredUsername(repository) {
    const { preferredUsername } = await load.call(this, repository);
    return preferredUsername;
  }

  async getPublicKey(repository) {
    const { publicKey } = await load.call(this, repository);
    return getChild.call(this, publicKey);
  }

  async getPublicKeyPem(repository) {
    const { publicKeyPem } = await load.call(this, repository);
    return publicKeyPem;
  }

  async getType(repository) {
    const { type } = await load.call(this, repository);
    return new Set(Array.isArray(type) ? type : [type]);
  }

  async act(repository, actor) {
    const [type] = await Promise.all([
      this.getType(repository),
      Promise.all([
        this.getActor(repository).then(actual => actual && actual.getId()),
        actor.getUri(repository)
      ]).then(([actual, expected]) => {
        if (actual && actual != expected) {
          throw new Error;
        }
      })
    ]);

    if (type.has('Create')) {
      return (await this.getObject(repository)).create(repository, actor);
    }

    if (type.has('Follow')) {
      return Follow.fromActivityStreams(repository, actor, this);
    }

    throw new TypeNotAllowed;
  }

  async create(repository, attributedTo) {
    const [type] = await Promise.all([
      this.getType(repository),
      Promise.all([
        this.getAttributedTo(repository)
            .then(actual => actual && actual.getId()),
        attributedTo.getUri(repository)
      ]).then(([actual, expected]) => {
        if (actual && actual != expected) {
          throw new Error;
        }
      })
    ]);

    if (type.has('Note')) {
      return Note.fromActivityStreams(repository, attributedTo, this);
    }

    throw new TypeNotAllowed;
  }
}
