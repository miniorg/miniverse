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
import { domainToASCII, domainToUnicode } from 'url';
import {
  Note as ActivityStreams,
  Hashtag as ActivityStreamsHashtag,
  Mention as ActivityStreamsMention
} from '../generated_activitystreams';
import ParsedActivityStreams, { NoHost } from '../parsed_activitystreams';
import Repository, { conflict } from '../repository';
import { postStatus, temporaryError } from '../transfer';
import Actor from './actor';
import Document from './document';
import Hashtag from './hashtag';
import Mention from './mention';
import Relation, { Reference } from './relation';
import Status from './status';
import { encodeSegment } from './uri';
import sanitizeHtml = require('sanitize-html');

async function tryToResolveLocalNoteByURI(repository: Repository, uri: string, recover: (error: Error) => unknown) {
  const localPrefix = `https://${domainToASCII(repository.host)}/@`;

  if (uri.startsWith(localPrefix)) {
    const [username, id] = uri.slice(localPrefix.length).split('/', 2);
    const note = await repository.selectNoteById(id);
    if (!note) {
      throw recover(new Error('Note not found.'));
    }

    const status = await note.select('status');
    if (!status) {
      throw recover(new Error('status not found.'));
    }

    const actor = await status.select('actor');
    if (!actor || username != actor.username) {
      throw recover(new Error('actor mismatches.'));
    }

    return note;
  }

  return null;
}

type Properties = ({ id: string } | { id?: string; status: Status }) & {
  inReplyToId: string | null;
  summary: string | null;
  content: string;
};

interface References {
  status: Status | null;
  attachments?: Document[];
  hashtags: Hashtag[];
  mentions: Mention[];
}

type ActivityStreamsTag = ActivityStreamsHashtag | ActivityStreamsMention;

const attachmentError = {};
const idMissing = {};
const inReplyToError = {};
const mentionToActivityStramsFailed = {};
const noteNotFound = {};
const statusUriUnresolved = {};
const tagError = {};

const isNotNull = Boolean as unknown as <T>(t: T | null) => t is T;

function isString(string: unknown): string is string {
  return typeof string == 'string';
}

function attachmentFromActivityStreams(repository: Repository, attachment: (ParsedActivityStreams | null)[] | null, signal: AbortSignal) {
  return attachment ? Promise.all(attachment.map(async element => {
    if (!element) {
      return null;
    }

    let type;
    try {
      type = await element.getType(signal, () => attachmentError);
    } catch (error) {
      if (error == attachmentError) {
        return null;
      }

      throw error;
    }

    if (type.has('Document')) {
      return Document.fromParsedActivityStreams(repository, element, signal, () => attachmentError).catch(error => {
        if (error == attachmentError) {
          return null;
        }

        throw error;
      });
    } else {
      return null;
    }
  })) : [];
}

function tagFromActivityStreams(repository: Repository, nullableTag: (ParsedActivityStreams | null)[] | null, signal: AbortSignal) {
  if (!nullableTag) {
    return [[], []] as [unknown[], (Actor | null)[]];
  }

  const tag = nullableTag.filter(isNotNull);
  const asyncTypes = tag.map(element => element.getType(signal, () => tagError));

  return Promise.all([
    Promise.all(asyncTypes.map(async (asyncType, index) => {
      try {
        const type = await asyncType;
        if (!type || !type.has('Hashtag')) {
          return null;
        }

        return tag[index].getName(signal, () => tagError);
      } catch (error) {
        if (error == tagError) {
          return null;
        }

        throw error;
      }
    })),
    Promise.all(tag.map(async (element, index) => {
      let href;

      try {
        const type = await asyncTypes[index];
        if (!type || !type.has('Mention')) {
          return null;
        }

        href = await element.getHref(signal, () => tagError);
      } catch (error) {
        if (error == tagError) {
          return null;
        }

        throw error;
      }
      if (typeof href != 'string') {
        return null;
      }

      const parsed = new ParsedActivityStreams(repository, href, NoHost);
      return Actor.fromParsedActivityStreams(repository, parsed, signal, () => tagError).catch(error => {
        if (error != tagError) {
          throw error;
        }

        return null;
      });
    }))
  ]);
}

function validate({ summary }: Seed, recover: (error: Error) => unknown) {
  if (summary == '') {
    throw recover(new Error('summary empty.'));
  }
}

export const unexpectedType = Symbol();

export interface Seed {
  readonly status: {
    readonly actor: Actor;
    readonly published: Date;
    readonly uri: string | null;
  };
  readonly inReplyTo: {
    readonly id: string;
    readonly uri: any;
  } | {
    readonly id: null;
    readonly uri: null | string;
  };
  readonly summary: string | null;
  readonly content: string;
  readonly attachments: Document[];
  readonly hashtags: string[];
  readonly mentions: Actor[];
}

export default class Note extends Relation<Properties, References> {
  readonly id!: string;
  readonly inReplyToId!: string | null;
  readonly status?: Reference<Status>;
  readonly summary!: string | null;
  readonly content!: string;
  readonly attachments?: Reference<Document[]>;
  readonly hashtags?: Reference<Hashtag[]>;
  readonly mentions?: Reference<Mention[]>;

  async toActivityStreams(recover: (error: Error) => unknown): Promise<ActivityStreams> {
    const [
      [published, [attributedToActor, attributedTo]],
      attachment,
      hashtags,
      mentions,
      inReplyTo
    ] = await Promise.all([
      this.select('status').then(status => {
        if (!status) {
          throw recover(new Error('status not found.'));
        }

        return Promise.all([
          status.published,
          status.select('actor').then(actor => {
            if (!actor) {
              throw recover(new Error('status\'s actor not found.'));
            }

            return Promise.all([actor, actor.getUri(recover)]);
          })
        ]);
      }),
      this.select('attachments').then(array => {
        if (!array) {
          throw new Error('status\'s attachments cannot be fetched.');
        }

        return Promise.all(array.map(element => element.toActivityStreams()));
      }),
      this.select('hashtags').then(array =>
        Promise.all(array.map(element => element.toActivityStreams()))),
      this.select('mentions').then(array =>
        Promise.all(array.map(element =>
          element.toActivityStreams(() => mentionToActivityStramsFailed).catch(error => {
            if (error == mentionToActivityStramsFailed) {
              return null;
            }

            throw error;
          })))),
      this.inReplyToId ? this.repository.selectStatusById(this.inReplyToId).then(async status => {
        if (status) {
          return status.getUri(() => statusUriUnresolved).catch(error => {
            if (error == statusUriUnresolved) {
              return null;
            }

            throw error;
          })
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
      throw recover(new Error('status\'s actor\'s uri not found.'));
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

  static async create(repository: Repository, {
    status,
    inReplyTo,
    summary,
    content,
    attachments,
    hashtags,
    mentions
  }: Seed, recover: (error: Error) => unknown) {
    const seed = {
      status,
      inReplyTo,
      summary: summary && sanitizeHtml(summary),
      content: sanitizeHtml(content),
      attachments,
      hashtags,
      mentions
    };

    validate(seed, recover);
    const note = await repository.insertNote(seed, recover);

    const insertedStatus = await note.select('status');
    if (!insertedStatus) {
      throw new Error('status not inserted.');
    }

    await postStatus(repository, insertedStatus, recover);

    return note;
  }

  static async createFromParsedActivityStreams(repository: Repository, object: ParsedActivityStreams, givenAttributedTo: Actor | null, signal: AbortSignal, recover: (error: Error & {
    [conflict]?: boolean;
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const type = await object.getType(signal, recover);
    if (!type.has('Note')) {
      throw recover(Object.assign(new Error('Unsupported type. Expected Note.'), { [unexpectedType]: true }));
    }

    const [
      uri, published, attributedTo, to,
      [inReplyToId, inReplyToUri], summary, content, attachments,
      [hashtags, mentions]
    ] = await Promise.all([
      object.getId(recover),
      object.getPublished(signal, recover),
      givenAttributedTo || object.getAttributedTo(signal, recover).then(attributedTo => {
        if (!attributedTo) {
          throw recover(new Error('attributedTo unspecified.'));
        }

        return Actor.fromParsedActivityStreams(repository, attributedTo, signal, recover);
      }),
      object.getTo(signal, recover).then(elements => elements ? Promise.all(elements.map(element => {
        if (!element) {
          return null;
        }

        try
        {
          return element.getId(() => idMissing);
        } catch (error) {
          if (error == idMissing) {
            return null;
          }

          throw error;
        }
      })) : []),
      object.getInReplyTo(signal, () => inReplyToError).then(async parsed => {
        if (!parsed) {
          return [null, null];
        }

        const uri = await parsed.getId(() => inReplyToError);
        if (typeof uri != 'string') {
          return [null, null];
        }

        const note = await tryToResolveLocalNoteByURI(repository, uri, () => noteNotFound).catch(error => {
          if (error == noteNotFound) {
            return null;
          }

          throw error;
        });

        return [note ? note.id : null, uri];
      }).catch(error => {
        if (error == inReplyToError) {
          return [null, null];
        }

        throw error;
      }),
      object.getSummary(signal, recover),
      object.getContent(signal, recover),
      object.getAttachment(signal, () => attachmentError).then(attachment => attachmentFromActivityStreams(repository, attachment, signal), error => {
        if (error == attachmentError) {
          return [] as (Document | null)[];
        }

        throw error;
      }),
      object.getTag(signal, () => tagError).then(tag => tagFromActivityStreams(repository, tag, signal), error => {
        if (error == tagError) {
          return [[], []] as [unknown[], (Actor | null)[]];
        }

        throw error;
      }),
    ]);

    if (!published) {
      throw recover(new Error('published not specified.'));
    }

    if (!attributedTo) {
      throw recover(new Error('attributedTo not specified.'));
    }

    if (!to.includes('https://www.w3.org/ns/activitystreams#Public')) {
      return null;
    }

    return this.create(repository, {
      status: {
        actor: attributedTo,
        published,
        uri: typeof uri == 'string' ? uri : null
      },
      summary: typeof summary == 'string' ? summary : null,
      content: typeof content == 'string' ? content: '',
      attachments: attachments.filter(isNotNull),
      hashtags: hashtags.filter(isString),
      mentions: mentions.filter(isNotNull),
      inReplyTo: {
        id: inReplyToId,
        uri: inReplyToUri
      } as any
    }, recover);
  }

  static async fromParsedActivityStreams(repository: Repository, object: ParsedActivityStreams, givenAttributedTo: Actor | null, signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
    const uri = await object.getId(recover);
    if (typeof uri == 'string') {
      const localNote = await tryToResolveLocalNoteByURI(repository, uri, recover);
      if (localNote) {
        return localNote;
      }

      const uriEntity = await repository.selectAllocatedURI(uri);
      if (uriEntity) {
        const remoteNote = await repository.selectNoteById(uriEntity.id);
        if (remoteNote) {
          return remoteNote;
        }

        throw recover(new Error('Note not found.'));
      }
    }

    let conflictError: Error | undefined;

    return this.createFromParsedActivityStreams(
      repository, object, givenAttributedTo, signal,
      error => {
        if (error[conflict]) {
          conflictError = error;
          return error;
        }
        
        return recover(error);
      }
    ).catch(async error => {
      if (!conflictError) {
        throw error;
      }

      if (typeof uri == 'string') {
        const uriEntity = await repository.selectAllocatedURI(uri);
        if (uriEntity) {
          const remoteNote = await repository.selectNoteById(uriEntity.id);
          if (remoteNote) {
            return remoteNote;
          }

          throw recover(new Error('Note not found.'));
        }
      }

      throw recover(conflictError);
    });
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
