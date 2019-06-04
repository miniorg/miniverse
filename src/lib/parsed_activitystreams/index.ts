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

import { AbortSignal } from 'abort-controller';
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

  async getActor(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = (await load.call(this, signal, recover));
    return getChildCheckingType.call(this, body.actor, signal, recover);
  }

  async getAttachment(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    const collection = await getChildCheckingType.call(this, body.attachment, signal, recover);
    return collection && collection.getItems(signal, recover);
  }

  async getAttributedTo(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return getChildCheckingType.call(this, body.attributedTo, signal, recover);
  }

  async getContent(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    return (await load.call(this, signal, recover)).body.content;
  }

  async getContext(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { context } = await load.call(this, signal, recover);
    return new Set<unknown>(Array.isArray(context) ? context : [context]);
  }

  async getHref(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    return (await load.call(this, signal, recover)).body.href;
  }

  async getItems(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const getChildOfThisCheckingType =
      (item: unknown) => getChildCheckingType.call(this, item, signal, recover);

    const [{ body }, type] = await Promise.all([
      load.call(this, signal, recover),
      this.getType(signal, recover)
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

  async getInbox(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return getChildCheckingType.call(this, body.inbox, signal, recover);
  }

  async getInReplyTo(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return getChildCheckingType.call(this, body.inReplyTo, signal, recover);
  }

  async getName(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return body.name;
  }

  async getObject(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return getChildCheckingType.call(this, body.object, signal, recover);
  }

  async getOwner(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return getChildCheckingType.call(this, body.owner, signal, recover);
  }

  async getPreferredUsername(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return body.preferredUsername;
  }

  async getPublicKey(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return getChildCheckingType.call(this, body.publicKey, signal, recover);
  }

  async getPublicKeyPem(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return body.publicKeyPem;
  }

  async getPublished(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return typeof body.published == 'string' ? new Date(body.published) : null;
  }

  async getSummary(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    return body.summary;
  }

  async getTag(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    const collection = await getChildCheckingType.call(this, body.tag, signal, recover);
    return collection && collection.getItems(signal, recover);
  }

  async getTo(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    const collection = await getChildCheckingType.call(this, body.to, signal, recover);

    return body.to === 'https://www.w3.org/ns/activitystreams#Public' ?
      [collection] : collection && collection.getItems(signal, recover);
  }

  async getType(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body: { type } } = await load.call(this, signal, recover);
    return new Set<unknown>(Array.isArray(type) ? type : [type]);
  }

  async getUrl(signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const { body } = await load.call(this, signal, recover);
    const normalized =
      typeof body.url == 'string' ? { type: 'Link', href: body.url } : body.url;

    return await getChildCheckingType.call(this, normalized, signal, recover);
  }

  async act(actor: Actor, signal: AbortSignal, recover: (error: Error & {
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
        this.getActor(signal, recover).then(actual => actual && actual.getId(recover)),
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
        signal,
        error => error[unexpectedDeleteType] ? unexpectedTypeReported : recover(error)),
      () => Follow.createFromParsedActivityStreams(
        this.repository,
        this,
        actor,
        signal,
        error => error[unexpectedFollowType] ? unexpectedTypeReported : recover(error)),
      () => Like.createFromParsedActivityStreams(
        this.repository,
        this,
        actor,
        signal,
        error => error[unexpectedLikeType] ? unexpectedTypeReported : recover(error)),
      () => Undo.createFromParsedActivityStreams(
        this.repository,
        this,
        actor,
        signal,
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
        signal,
        error => error[unexpectedAnnounceType] ? unexpectedTypeReported : recover(error));
    } catch (error) {
      if (error != unexpectedTypeReported) {
        throw error;
      }

      created = await Create.createFromParsedActivityStreams(this.repository, this, actor, signal, error =>
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

function load(this: ParsedActivityStreams, signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  const { repository, referenceId, parentContent } = this;

  if (!this.content) {
    if (!referenceId) {
      throw recover(new Error('Reference id unspecified.'));
    }

    this.content = parentContent.then(async ({ context, resolver }) => {
      const resolved = await resolver.resolve(repository, referenceId, signal, recover);

      if (!resolved.context) {
        resolved.context = context;
      }

      return resolved;
    });
  }

  return this.content;
}

function getChild(this: ParsedActivityStreams, body: object | string, signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  const content = load.call(this, signal, recover);

  return new ParsedActivityStreams(
    this.repository,
    body,
    this.normalizedHost,
    content);
}

function getChildCheckingType(this: ParsedActivityStreams, body: unknown, signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  return body instanceof Object || typeof body == 'string' ?
    getChild.call(this, body, signal, recover) : null;
}