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

function load(repository) {
  if (!this.content) {
    this.content = this.parentContent.then(async ({ context, resolver }) => {
      const resolved = await resolver.resolve(repository, this.referenceId);

      if (!resolved.context) {
        resolved.context = context;
      }

      return resolved;
    });
  }

  return this.content;
}

function getChild(repository, body) {
  const content = load.call(this, repository);
  return body && new this.constructor(body, this.normalizedHost, content);
}

export const AnyHost = {};
export const NoHost = {};
export class TypeNotAllowed extends Error {}

export default class {
  constructor(body, normalizedHost, parentContent = Promise.resolve({
    context: null,
    resolver: new Resolver
  })) {
    if (body instanceof Object) {
      if (body.id) {
        const { host } = new URL(body.id);

        this.normalizedHost = URI.normalizeHost(host);

        if ([AnyHost, this.normalizedHost].includes(normalizedHost)) {
          this.referenceId = null;
          this.content = parentContent.then(({ resolver, context }) => ({
            resolver,
            context: body['@context'] || context,
            body
          }));
        } else {
          this.referenceId = body.id;
          this.content = null;
        }
      } else {
        this.referenceId = null;
        this.normalizedHost = normalizedHost;
        this.content = parentContent.then(({ resolver, context }) => ({
          resolver,
          context: body['@context'] || context,
          body
        }));
      }
    } else {
      const { host } = new URL(body);

      this.normalizedHost = URI.normalizeHost(host);
      this.referenceId = body;
      this.content = null;
    }

    this.parentContent = parentContent;
  }

  async getActor(repository) {
    const { body } = await load.call(this, repository);
    return getChild.call(this, repository, body.actor);
  }

  async getAttributedTo(repository) {
    const { body } = await load.call(this, repository);
    return getChild.call(this, repository, body.attributedTo);
  }

  async getContent(repository) {
    const { body } = await load.call(this, repository);
    return body.content;
  }

  async getContext(repository) {
    const { context } = await load.call(this, repository);
    return new Set(Array.isArray(context) ? context : [context]);
  }

  async getItems(repository) {
    const getChildOfThis = getChild.bind(this, repository);
    const [{ body }, type] = await Promise.all([
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
    return this.referenceId || (await this.content).body.id;
  }

  async getInbox(repository) {
    const { body } = await load.call(this, repository);
    return getChild.call(this, repository, body.inbox);
  }

  async getObject(repository) {
    const { body } = await load.call(this, repository);
    return getChild.call(this, repository, body.object);
  }

  async getOwner(repository) {
    const { body } = await load.call(this, repository);
    return getChild.call(this, repository, body.owner);
  }

  async getPreferredUsername(repository) {
    const { body } = await load.call(this, repository);
    return body.preferredUsername;
  }

  async getPublicKey(repository) {
    const { body } = await load.call(this, repository);
    return getChild.call(this, repository, body.publicKey);
  }

  async getPublicKeyPem(repository) {
    const { body } = await load.call(this, repository);
    return body.publicKeyPem;
  }

  async getType(repository) {
    const { body: { type } } = await load.call(this, repository);
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
      return Follow.fromParsedActivityStreams(repository, actor, this);
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
      return Note.fromParsedActivityStreams(repository, attributedTo, this);
    }

    throw new TypeNotAllowed;
  }
}
