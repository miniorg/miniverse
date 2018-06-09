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
import Create from '../create';
import Delete from '../delete';
import Follow from '../follow';
import Undo from '../undo';
import { normalizeHost } from '../uri';
import Resolver from './resolver';

function load() {
  const { repository, referenceId, parentContent } = this;

  if (!this.content) {
    this.content = parentContent.then(async ({ context, resolver }) => {
      const resolved = await resolver.resolve(repository, referenceId);

      if (!resolved.context) {
        resolved.context = context;
      }

      return resolved;
    });
  }

  return this.content;
}

function getChild(body) {
  const content = load.call(this);

  return body &&
    new this.constructor(this.repository, body, this.normalizedHost, content);
}

export const AnyHost = {};
export const NoHost = {};
export class TypeNotAllowed extends Error {}

export default class {
  constructor(repository, body, normalizedHost, parentContent = Promise.resolve({
    context: null,
    resolver: new Resolver
  })) {
    if (body instanceof Object) {
      if (body.id) {
        const { host } = new URL(body.id);

        this.normalizedHost = normalizeHost(host);

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

      this.normalizedHost = normalizeHost(host);
      this.referenceId = body;
      this.content = null;
    }

    this.repository = repository;
    this.parentContent = parentContent;
  }

  async getActor() {
    const { body } = await load.call(this);
    return getChild.call(this, body.actor);
  }

  async getAttributedTo() {
    const { body } = await load.call(this);
    return getChild.call(this, body.attributedTo);
  }

  async getContent() {
    const { body } = await load.call(this);
    return body.content;
  }

  async getContext() {
    const { context } = await load.call(this);
    return new Set(Array.isArray(context) ? context : [context]);
  }

  async getItems() {
    const getChildOfThis = getChild.bind(this);
    const [{ body }, type] = await Promise.all([
      load.call(this),
      this.getType()
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

  async getInbox() {
    const { body } = await load.call(this);
    return getChild.call(this, body.inbox);
  }

  async getObject() {
    const { body } = await load.call(this);
    return getChild.call(this, body.object);
  }

  async getOwner() {
    const { body } = await load.call(this);
    return getChild.call(this, body.owner);
  }

  async getPreferredUsername() {
    const { body } = await load.call(this);
    return body.preferredUsername;
  }

  async getPublicKey() {
    const { body } = await load.call(this);
    return getChild.call(this, body.publicKey);
  }

  async getPublicKeyPem() {
    const { body } = await load.call(this);
    return body.publicKeyPem;
  }

  async getTo() {
    const { body } = await load.call(this);
    const collection = await getChild.call(this, body.to);

    return body.to == 'https://www.w3.org/ns/activitystreams#Public' ?
      [collection] : collection.getItems();
  }

  async getType() {
    const { body: { type } } = await load.call(this);
    return new Set(Array.isArray(type) ? type : [type]);
  }

  async act(actor) {
    const [type] = await Promise.all([
      this.getType(),
      Promise.all([
        this.getActor().then(actual => actual && actual.getId()),
        actor.getUri()
      ]).then(([actual, expected]) => {
        if (actual && actual != expected) {
          throw new Error;
        }
      })
    ]);

    if (type.has('Create')) {
      return Create.fromParsedActivityStreams(this.repository, actor, this);
    }

    if (type.has('Delete')) {
      return Delete.fromParsedActivityStreams(this.repository, actor, this);
    }

    if (type.has('Follow')) {
      return Follow.fromParsedActivityStreams(this.repository, actor, this);
    }

    if (type.has('Undo')) {
      return Undo.fromParsedActivityStreams(this.repository, actor, this);
    }

    throw new TypeNotAllowed;
  }
}
