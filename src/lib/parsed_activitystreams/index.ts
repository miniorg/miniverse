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
import Repository from '../repository';
import { temporaryError } from '../transfer';
import Actor from '../tuples/actor';
import Announce, {
  unexpectedType as unexpectedAnnounceType
} from '../tuples/announce';
import Create, {
  unexpectedType as unexpectedCreateType
} from '../tuples/create';
import Delete, {
  unexpectedType as unexpectedDeleteType
} from '../tuples/delete';
import Follow, {
  unexpectedType as unexpectedFollowType
} from '../tuples/follow';
import Like, {
  unexpectedType as unexpectedLikeType
} from '../tuples/like';
import Undo, {
  unexpectedType as unexpectedUndoType
} from '../tuples/undo';
import { normalizeHost } from '../tuples/uri';
import Resolver from './resolver';

const unexpectedTypeReported = {};

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
export const unexpectedType = Symbol();

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

  async getActor(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = (await load.call(this, recover));
    return getChildCheckingType.call(this, body.actor, recover);
  }

  async getAttachment(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    const collection = await getChildCheckingType.call(this, body.attachment, recover);
    return collection && collection.getItems(recover);
  }

  async getAttributedTo(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return getChildCheckingType.call(this, body.attributedTo, recover);
  }

  async getContent(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    return (await load.call(this, recover)).body.content;
  }

  async getContext(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { context } = await load.call(this, recover);
    return new Set<unknown>(Array.isArray(context) ? context : [context]);
  }

  async getHref(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    return (await load.call(this, recover)).body.href;
  }

  async getItems(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const getChildOfThisCheckingType =
      (item: unknown) => getChildCheckingType.call(this, item, recover);

    const [{ body }, type] = await Promise.all([
      load.call(this, recover),
      this.getType(recover)
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

  async getId(recover: (error: Error) => unknown) {
    if (this.referenceId) {
      return this.referenceId;
    }

    if (this.content) {
      return ((await this.content).body as { id: unknown }).id;
    }

    throw recover(new Error('id missing.'));
  }

  async getInbox(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return getChildCheckingType.call(this, body.inbox, recover);
  }

  async getInReplyTo(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return getChildCheckingType.call(this, body.inReplyTo, recover);
  }

  async getName(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return body.name;
  }

  async getObject(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return getChildCheckingType.call(this, body.object, recover);
  }

  async getOwner(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return getChildCheckingType.call(this, body.owner, recover);
  }

  async getPreferredUsername(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return body.preferredUsername;
  }

  async getPublicKey(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return getChildCheckingType.call(this, body.publicKey, recover);
  }

  async getPublicKeyPem(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return body.publicKeyPem;
  }

  async getPublished(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return typeof body.published == 'string' ? new Date(body.published) : null;
  }

  async getSummary(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    return body.summary;
  }

  async getTag(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    const collection = await getChildCheckingType.call(this, body.tag, recover);
    return collection && collection.getItems(recover);
  }

  async getTo(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    const collection = await getChildCheckingType.call(this, body.to, recover);

    return body.to === 'https://www.w3.org/ns/activitystreams#Public' ?
      [collection] : collection && collection.getItems(recover);
  }

  async getType(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body: { type } } = await load.call(this, recover);
    return new Set<unknown>(Array.isArray(type) ? type : [type]);
  }

  async getUrl(recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, recover);
    const normalized =
      typeof body.url == 'string' ? { type: 'Link', href: body.url } : body.url;

    return await getChildCheckingType.call(this, normalized, recover);
  }

  async act(actor: Actor, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const uri = await this.getId(recover);
    if (typeof uri == 'string') {
      const entity = await this.repository.selectAllocatedURI(uri);
      if (entity) {
        return uri;
      }
    }

    await Promise.all([
      Promise.all([
        this.getActor(recover).then(actual => actual && actual.getId(recover)),
        actor.getUri(recover)
      ]).then(([actual, expected]) => {
        if (actual && actual != expected) {
          throw recover(new Error('Unexpected actor.'));
        }
      })
    ]);

    for (const create of [
      () => Delete.createFromParsedActivityStreams(
        this.repository,
        this,
        actor,
        error => error[unexpectedDeleteType] ? unexpectedTypeReported : recover(error)),
      () => Follow.createFromParsedActivityStreams(
        this.repository,
        this,
        actor,
        error => error[unexpectedFollowType] ? unexpectedTypeReported : recover(error)),
      () => Like.createFromParsedActivityStreams(
        this.repository,
        this,
        actor,
        error => error[unexpectedLikeType] ? unexpectedTypeReported : recover(error)),
      () => Undo.createFromParsedActivityStreams(
        this.repository,
        this,
        actor,
        error => error[unexpectedUndoType] ? unexpectedTypeReported : recover(error)),
    ]) {
      try {
        await create();
        return null;
      } catch (error) {
        if (error != unexpectedTypeReported) {
          throw error;
        }
      }
    }

    let created;

    try {
      created = await Announce.createFromParsedActivityStreams(
        this.repository,
        this,
        actor,
        error => error[unexpectedAnnounceType] ? unexpectedTypeReported : recover(error));
    } catch (error) {
      if (error != unexpectedTypeReported) {
        throw error;
      }

      created = await Create.createFromParsedActivityStreams(this.repository, this, actor, error =>
        recover(error[unexpectedCreateType] ?
          Object.assign(new Error('Unsupported type.'), { [unexpectedType]: true }) :
          error));

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

    return created.getUri(recover);
  }
}

function load(this: ParsedActivityStreams, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  const { repository, referenceId, parentContent } = this;

  if (!this.content) {
    if (!referenceId) {
      throw recover(new Error('Reference id unspecified.'));
    }

    this.content = parentContent.then(async ({ context, resolver }) => {
      const resolved = await resolver.resolve(repository, referenceId, recover);

      if (!resolved.context) {
        resolved.context = context;
      }

      return resolved;
    });
  }

  return this.content;
}

function getChild(this: ParsedActivityStreams, body: object | string, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  const content = load.call(this, recover);

  return new ParsedActivityStreams(
    this.repository,
    body,
    this.normalizedHost,
    content);
}

function getChildCheckingType(this: ParsedActivityStreams, body: unknown, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  return body instanceof Object || typeof body == 'string' ?
    getChild.call(this, body, recover) : null;
}
