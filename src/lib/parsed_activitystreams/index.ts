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
import { Custom as CustomError, Severity } from '../errors';
import Repository from '../repository';
import Actor from '../tuples/actor';
import Announce from '../tuples/announce';
import Create from '../tuples/create';
import Delete from '../tuples/delete';
import Follow from '../tuples/follow';
import Like from '../tuples/like';
import Undo from '../tuples/undo';
import { normalizeHost } from '../tuples/uri';
import Resolver from './resolver';

interface Body {
  readonly [key: string]: unknown;
}

interface Content {
  readonly resolver: Resolver;
  readonly context: unknown;
  readonly body?: Body;
}

export const AnyHost = {};
export const NoHost = {};
export class TypeNotAllowed extends CustomError {
  constructor(message: unknown, severity: Severity, originals: Error[] | null = null) {
    super(message, severity, originals);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export default class ParsedActivityStreams {
  readonly normalizedHost: object | string;
  readonly referenceId: null | string;
  content: Promise<Content & { readonly body: Body }> | null;
  readonly repository: Repository;
  readonly parentContent: Promise<Content>;

  constructor(repository: Repository, body: object | string, normalizedHost: object | string, parentContent: Promise<Content> = Promise.resolve({
    context: null,
    resolver: new Resolver
  })) {
    if (body instanceof Object) {
      const { id } = body as { id: unknown };

      if (typeof id == 'string') {
        const { host } = new URL(id);

        this.normalizedHost = normalizeHost(host);

        if ([AnyHost, this.normalizedHost].includes(normalizedHost)) {
          this.referenceId = null;
          this.content = parentContent.then(({ resolver, context }) => ({
            resolver,
            context: (body as { readonly [key: string]: unknown })['@context'] || context,
            body
          }));
        } else {
          this.referenceId = id;
          this.content = null;
        }
      } else {
        this.referenceId = null;
        this.normalizedHost = normalizedHost;
        this.content = parentContent.then(({ resolver, context }) => ({
          resolver,
          context: (body as { readonly [key: string]: unknown })['@context'] || context,
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
    const { body } = (await load.call(this));
    return getChildCheckingType.call(this, body.actor);
  }

  async getAttachment() {
    const { body } = await load.call(this);
    const collection = await getChildCheckingType.call(this, body.attachment);
    return collection && collection.getItems();
  }

  async getAttributedTo() {
    const { body } = await load.call(this);
    return getChildCheckingType.call(this, body.attributedTo);
  }

  async getContent() {
    return (await load.call(this)).body.content;
  }

  async getContext() {
    const { context } = await load.call(this);
    return new Set<unknown>(Array.isArray(context) ? context : [context]);
  }

  async getHref() {
    return (await load.call(this)).body.href;
  }

  async getItems() {
    const getChildOfThisCheckingType = getChildCheckingType.bind(this);
    const [{ body }, type] = await Promise.all([
      load.call(this),
      this.getType()
    ]);

    if (type.has('OrderedCollection')) {
      if (Array.isArray(body.orderedItems)) {
        return body.orderedItems.map(getChildOfThisCheckingType);
      }

      return [getChildOfThisCheckingType(body.orderedItems)];
    }

    if (type.has('Collection')) {
      if (Array.isArray(body.items)) {
        return body.items.map(getChildOfThisCheckingType);
      }

      return [getChildOfThisCheckingType(body.items)];
    }

    if (Array.isArray(body)) {
      return body.map(getChildOfThisCheckingType);
    }

    return [this];
  }

  async getId() {
    if (this.referenceId) {
      return this.referenceId;
    }

    if (this.content) {
      return ((await this.content).body as { id: unknown }).id;
    }

    throw new CustomError(
      'id is not given. Possibly invalid Activity Streams?', 'info');
  }

  async getInbox() {
    const { body } = await load.call(this);
    return getChildCheckingType.call(this, body.inbox);
  }

  async getInReplyTo() {
    const { body } = await load.call(this);
    return getChildCheckingType.call(this, body.inReplyTo);
  }

  async getName() {
    const { body } = await load.call(this);
    return body.name;
  }

  async getObject() {
    const { body } = await load.call(this);
    return getChildCheckingType.call(this, body.object);
  }

  async getOwner() {
    const { body } = await load.call(this);
    return getChildCheckingType.call(this, body.owner);
  }

  async getPreferredUsername() {
    const { body } = await load.call(this);
    return body.preferredUsername;
  }

  async getPublicKey() {
    const { body } = await load.call(this);
    return getChildCheckingType.call(this, body.publicKey);
  }

  async getPublicKeyPem() {
    const { body } = await load.call(this);
    return body.publicKeyPem;
  }

  async getPublished() {
    const { body } = await load.call(this);
    return typeof body.published == 'string' ? new Date(body.published) : null;
  }

  async getSummary() {
    const { body } = await load.call(this);
    return body.summary;
  }

  async getTag() {
    const { body } = await load.call(this);
    const collection = await getChildCheckingType.call(this, body.tag);
    return collection && collection.getItems();
  }

  async getTo() {
    const { body } = await load.call(this);
    const collection = await getChildCheckingType.call(this, body.to);

    return body.to === 'https://www.w3.org/ns/activitystreams#Public' ?
      [collection] : collection && collection.getItems();
  }

  async getType() {
    const { body: { type } } = await load.call(this);
    return new Set<unknown>(Array.isArray(type) ? type : [type]);
  }

  async getUrl() {
    const { body } = await load.call(this);
    const normalized =
      typeof body.url == 'string' ? { type: 'Link', href: body.url } : body.url;

    return await getChildCheckingType.call(this, normalized);
  }

  async act(actor: Actor) {
    const uri = await this.getId();
    if (typeof uri == 'string') {
      const entity = await this.repository.selectAllocatedURI(uri);
      if (entity) {
        return uri;
      }
    }

    await Promise.all([
      Promise.all([
        this.getActor().then(actual => actual && actual.getId()),
        actor.getUri()
      ]).then(([actual, expected]) => {
        if (actual && actual != expected) {
          throw new CustomError(
            'Given actor and actor in Activity Streams mismatch. Possibly invalid Activity Streams?',
            'info');
        }
      })
    ]);

    for (const Constructor of [Delete, Follow, Like, Undo]) {
      try {
        await Constructor.createFromParsedActivityStreams(
          this.repository, this, actor);

        return null;
      } catch (error) {
        if (!(error instanceof TypeNotAllowed)) {
          throw error;
        }
      }
    }

    let created;

    try {
      created = await Announce.createFromParsedActivityStreams(
        this.repository, this, actor);
    } catch (error) {
      if (!(error instanceof TypeNotAllowed)) {
        throw error;
      }

      created = await Create.createFromParsedActivityStreams(
        this.repository, this, actor);

      if (!created) {
        return null;
      }

      created = await created.select('object');
    }

    if (!created) {
      return null;
    }

    created = await created.select('status');
    if (!created) {
      return null;
    }

    return created.getUri();
  }
}

function load(this: ParsedActivityStreams) {
  const { repository, referenceId, parentContent } = this;

  if (!this.content) {
    this.content = parentContent.then(async ({ context, resolver }) => {
      if (!referenceId) {
        throw new CustomError('id is unknown.', 'error');
      }

      const resolved = await resolver.resolve(repository, referenceId);

      if (!resolved.context) {
        resolved.context = context;
      }

      return resolved;
    });
  }

  return this.content;
}

function getChild(this: ParsedActivityStreams, body: object | string) {
  const content = load.call(this);

  return new ParsedActivityStreams(
    this.repository,
    body,
    this.normalizedHost,
    content);
}

function getChildCheckingType(this: ParsedActivityStreams, body: unknown) {
  return body instanceof Object || typeof body == 'string' ?
    getChild.call(this, body) : null;
}
