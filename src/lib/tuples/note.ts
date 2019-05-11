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

import { domainToASCII, domainToUnicode } from 'url';
import { Custom as CustomError } from '../errors';
import {
  Note as ActivityStreams,
  Hashtag as ActivityStreamsHashtag,
  Mention as ActivityStreamsMention
} from '../generated_activitystreams';
import ParsedActivityStreams, { NoHost, TypeNotAllowed } from '../parsed_activitystreams';
import Repository from '../repository';
import { postStatus } from '../transfer';
import Actor from './actor';
import Document from './document';
import Hashtag from './hashtag';
import Mention from './mention';
import Relation, { Reference } from './relation';
import Status from './status';
import URI, { encodeSegment } from './uri';
import sanitizeHtml = require('sanitize-html');

async function tryToResolveLocalNoteByURI(repository: Repository, uri: string) {
  const localPrefix = `https://${domainToASCII(repository.host)}/@`;

  if (uri.startsWith(localPrefix)) {
    const [username, id] = uri.slice(localPrefix.length).split('/', 2);
    const note = await repository.selectNoteById(id);
    if (!note) {
      return null;
    }

    const status = await note.select('status');
    if (!status) {
      return null;
    }

    const actor = await status.select('actor');
    if (!actor || username != actor.username) {
      return null;
    }

    return note;
  }

  return null;
}

interface Properties {
  id?: string;
  inReplyToId?: string | null;
  summary: string | null;
  content: string;
}

interface References {
  status: Status | null;
  attachments?: Document[];
  hashtags: Hashtag[];
  mentions: Mention[];
}

interface Options {
  readonly uri?: string | null;
  readonly inReplyToId?: string | null;
  readonly inReplyToUri?: string | null;
  readonly summary?: string | null;
  readonly attachments?: Document[];
  readonly hashtags?: string[];
  readonly mentions?: Actor[];
}

type ActivityStreamsTag = ActivityStreamsHashtag | ActivityStreamsMention;

const isNotNull = Boolean as unknown as <T>(t: T | null) => t is T;

function isString(string: unknown): string is string {
  return typeof string == 'string';
}

export default class Note extends Relation<Properties, References> {
  id?: string;
  inReplyToId?: string;
  readonly status?: Reference<Status>;
  readonly summary!: string | null;
  readonly content!: string;
  readonly attachments?: Reference<Document[]>;
  readonly hashtags?: Reference<Hashtag[]>;
  readonly mentions?: Reference<Mention[]>;

  async toActivityStreams(): Promise<ActivityStreams> {
    const [
      [published, [attributedToActor, attributedTo]],
      attachment,
      hashtags,
      mentions,
      inReplyTo
    ] = await Promise.all([
      this.select('status').then(status => {
        if (!status) {
          throw new CustomError('The status cannot be fetched.', 'error');
        }

        return Promise.all([
          status.published,
          status.select('actor').then(actor => {
            if (!actor) {
              throw new CustomError('The actor who the note is attributed to cannot be fetched.', 'error');
            }

            return Promise.all([actor, actor.getUri()]);
          })
        ]);
      }),
      this.select('attachments').then(array => {
        if (!array) {
          throw new CustomError('The attachments cannot be fetched.', 'error');
        }

        return Promise.all(array.map(element => element.toActivityStreams()));
      }),
      this.select('hashtags').then(array =>
        Promise.all(array.map(element => element.toActivityStreams()))),
      this.select('mentions').then(array =>
        Promise.all(array.map(element => element.toActivityStreams()))),
      this.inReplyToId ? this.repository.selectStatusById(this.inReplyToId).then(async status => {
        if (status) {
          return status.getUri();
        }

        if (!this.inReplyToId) {
          return null;
        }

        const uri = await this.repository.selectURIById(this.inReplyToId);
        return uri && uri.uri;
      }) : null,
    ]);

    const repositoryHost = domainToASCII(this.repository.host);
    const acct = encodeSegment(attributedToActor.host ?
      `${attributedToActor.username}@${domainToUnicode(attributedToActor.host)}` :
      attributedToActor.username);

    if (!attributedTo) {
      throw new CustomError('The URI of the actor which the note is attributed to cannot be found.', 'error');
    }

    return {
      type: 'Note',
      id: `https://${repositoryHost}/@${acct}/${this.id}`,
      published,
      attributedTo,
      inReplyTo,
      to: 'https://www.w3.org/ns/activitystreams#Public',
      summary: this.summary,
      content: this.content,
      attachment,

      // Support concat operations on arrays of different types · Issue #26378 · Microsoft/TypeScript
      // https://github.com/Microsoft/TypeScript/issues/26378
      tag: ((hashtags as unknown) as ActivityStreamsTag[]).concat((mentions as unknown) as ActivityStreamsTag[])
    };
  }

  validate() {
    if (this.summary == '') {
      throw new CustomError('empty summary is not allowd.', 'info');
    }
  }

  static async create(repository: Repository, published: Date, actor: Actor, content: string, {
    uri = null,
    inReplyToId = null,
    inReplyToUri = null,
    summary = null,
    attachments = [],
    hashtags = [],
    mentions = []
  }: Options = {}) {
    const note = new this({
      repository,
      status: new Status({
        repository,
        published,
        actor,
        uri: uri == null ? null : new URI({ repository, uri, allocated: true })
      }),
      inReplyToId,
      summary: summary && sanitizeHtml(summary),
      content: sanitizeHtml(content),
      attachments,
      hashtags: hashtags.map(name => new Hashtag({ repository, name })),
      mentions: mentions.map(href => new Mention({ repository, href }))
    });

    note.validate();
    await repository.insertNote(note, inReplyToUri);

    const status = await note.select('status');
    if (!status) {
      throw new CustomError('The status is not inserted.', 'error');
    }

    await postStatus(repository, status);

    return note;
  }

  static async createFromParsedActivityStreams(repository: Repository, object: ParsedActivityStreams, givenAttributedTo?: Actor) {
    const type = await object.getType();
    if (!type.has('Note')) {
      throw new TypeNotAllowed('Unexpected type. Expected Note.', 'info');
    }

    const [
      uri, published, attributedTo, to,
      [inReplyToId, inReplyToUri], summary, content, attachments,
      [hashtags, mentions]
    ] = await Promise.all([
      object.getId(),
      object.getPublished(),
      givenAttributedTo || object.getAttributedTo().then(attributedTo => {
        if (!attributedTo) {
          throw new CustomError('The actor who the note is attributed to is unspecified.', 'error');
        }

        return Actor.fromParsedActivityStreams(repository, attributedTo);
      }),
      object.getTo().then(elements => elements ?
        Promise.all(elements.filter(isNotNull).map(element => element.getId())) : []),
      object.getInReplyTo().then(async parsed => {
        if (!parsed) {
          return [null, null];
        }

        const uri = await parsed.getId();
        if (typeof uri != 'string') {
          return [null, null];
        }

        const note = await tryToResolveLocalNoteByURI(repository, uri);

        return [note ? note.id : null, uri];
      }),
      object.getSummary(),
      object.getContent(),
      object.getAttachment().then(attachment => attachment ?
        Promise.all(attachment.filter(isNotNull).map(async element => {
          const type = await element.getType();

          return type.has('Document') ?
            Document.fromParsedActivityStreams(repository, element) : null;
        })) : []),
      object.getTag().then(async nullableTag => {
        if (!nullableTag) {
          return [[], []] as [Set<unknown>[], (Actor | null)[]];
        }

        const tag = nullableTag.filter(isNotNull);
        const asyncTypes = tag.map(element => element.getType());

        return Promise.all([
          Promise.all(asyncTypes).then(types => Promise.all(types
            .map((type, index) => [type, index] as [Set<unknown>, number])
            .filter(([type]) => type.has('Hashtag'))
            .map(([, index]) => tag[index].getName()))),
          Promise.all(tag.map(async (element, index) => {
            const type = await asyncTypes[index];

            if (type.has('Mention')) {
              const href = await element.getHref();
              if (typeof href != 'string') {
                throw new CustomError('Mention\'s href is not string', 'error');
              }

              const parsed =
                new ParsedActivityStreams(repository, href, NoHost);

              return Actor.fromParsedActivityStreams(repository, parsed);
            }

            return null;
          }))
        ]);
      }),
    ]);

    if (!published) {
      throw new CustomError('published not specified.', 'error');
    }

    if (!attributedTo) {
      throw new CustomError('The actor who the note is attributed to cannot be fetched', 'error');
    }

    if (!to.includes('https://www.w3.org/ns/activitystreams#Public')) {
      return null;
    }

    return this.create(repository, published, attributedTo, typeof content == 'string' ? content: '', {
      uri: typeof uri == 'string' ? uri : null,
      summary: typeof summary == 'string' ? summary : null,
      attachments: attachments.filter(isNotNull),
      hashtags: hashtags.filter(isString),
      mentions: mentions.filter(isNotNull),
      inReplyToId, inReplyToUri
    });
  }

  static async fromParsedActivityStreams(repository: Repository, object: ParsedActivityStreams, givenAttributedTo?: Actor) {
    const uri = await object.getId();
    if (typeof uri == 'string') {
      const localNote = await tryToResolveLocalNoteByURI(repository, uri);
      if (localNote) {
        return localNote;
      }

      const uriEntity = await repository.selectAllocatedURI(uri);
      if (uriEntity) {
        const { id } = uriEntity;
        if (!id) {
          throw new CustomError('The internal id cannot be fetched', 'error');
        }

        const remoteNote = await repository.selectNoteById(id);
        if (remoteNote) {
          return remoteNote;
        }

        throw new TypeNotAllowed('Unexpected type. Expected Note.', 'info');
      }
    }

    return this.createFromParsedActivityStreams(
      repository, object, givenAttributedTo);
  }
}

Note.references = {
  status: {
    query: Note.withRepository('selectStatusById'),
    id: 'id',
    inverseOf: 'extension'
  },
  attachments: {
    query: Note.withRepository('selectDocumentsByAttachedNoteId'),
    id: 'id',
  },
  hashtags: {
    query: Note.withRepository('selectHashtagsByNoteId'),
    id: 'id'
  },
  mentions: {
    query: Note.withRepository('selectMentionsIncludingActorsByNoteId'),
    id: 'id'
  }
};
