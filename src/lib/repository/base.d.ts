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

import { Queue } from 'bull';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import S3 = require('aws-sdk/clients/s3');
import { Analytics } from '../store/base';
import Actor from '../tuples/actor';
import Announce from '../tuples/announce';
import Challenge from '../tuples/challenge';
import Cookie from '../tuples/cookie';
import Document from '../tuples/document';
import Follow from '../tuples/follow';
import Hashtag from '../tuples/hashtag';
import Like from '../tuples/like';
import LocalAccount from '../tuples/local_account';
import Mention from '../tuples/mention';
import Note from '../tuples/note';
import RemoteAccount from '../tuples/remote_account';
import Status from '../tuples/status';
import URI from '../tuples/uri';
import Actors from './actors';
import Announces from './announces';
import Challenges from './challenges';
import Cookies from './cookies';
import Documents from './documents';
import Follows from './follows';
import Hashtags from './hashtags';
import Likes from './likes';
import LocalAccounts from './local_accounts';
import Mentions from './mentions';
import RemoteAccounts from './remote_accounts';
import Notes from './notes';
import Pg from './pg';
import Statuses from './statuses';
import Subscribers, { Listen } from './subscribers';
import Syslog from './syslog';
import UnlinkedDocuments from './unlinked_documents';
import URIs from './uris';

declare namespace Option {
  interface Captcha {
    readonly secret?: string;
    readonly site?: string;
    readonly verifier?: string;
  }

  interface Content {
    readonly frame: { readonly sourceList?: string };
    readonly image: { readonly sourceList?: string };
    readonly script: { readonly sourceList?: string, readonly sources: string[] };
  }

  interface Document {
    readonly keyPrefix?: string;
    readonly urlPrefix: string;
  }
}

export interface Options {
  readonly analytics: Analytics;
  readonly captcha: Option.Captcha;
  readonly console: Console;
  readonly content: Option.Content;
  readonly document: Option.Document;
  readonly host?: string;
  readonly fingerHost?: string;
  readonly pg: Pool;
  readonly redis: { readonly prefix?: string, readonly url?: string };
  readonly s3: { service: S3, readonly bucket?: string };
}

interface RedisRepository {
  readonly prefix: string;
  readonly url: string;
  readonly client: Redis;
  readonly subscriber: Redis;
}

export default class Repository implements
    Actors, Announces, Challenges, Cookies,
    Documents, Follows, Hashtags, Likes,
    LocalAccounts, Mentions, Notes, RemoteAccounts,
    Statuses, Subscribers, UnlinkedDocuments, URIs {
  constructor(options: Options);

  selectActorById(id: string): Promise<Actor | null>;
  selectActorByUsernameAndNormalizedHost(
    username: string, normalizedHost: string | null):
      Promise<Actor | null>;
  selectActorsByFolloweeId(id: string): Promise<Actor[]>;
  selectActorsMentionedByNoteId(id: string): Promise<Actor[]>;

  insertAnnounce(announce: Announce): Promise<void>;

  insertChallenge(challenge: Challenge): Promise<void>;
  selectChallengeByDigest(digest: Buffer): Promise<Challenge | null>;

  insertCookie(cookie: Cookie): Promise<void>;

  insertDocument(document: Document): Promise<void>;
  selectDocumentById(id: string): Promise<Document>;
  selectDocumentsByAttachedNoteId(id: string): Promise<Document[]>;

  deleteFollowByActorAndObject(actor: Actor, object: Actor): Promise<void>;
  insertFollow(follow: Follow): Promise<void>;
  selectFollowIncludingActorAndObjectById(id: string): Promise<Follow | null>;

  selectHashtagsByNoteId(noteId: string): Promise<Hashtag[]>;

  deleteLikeByActorAndObject(actor: Actor, object: Note): Promise<void>;
  insertLike(like: Like): Promise<void>;
  selectLikeById(id: string): Promise<Like | null>;

  getInboxChannel(accountOrActor: LocalAccount | Actor): string;
  insertLocalAccount(account: LocalAccount): Promise<void>;
  insertIntoInboxes(accountOrActors: (LocalAccount | Actor)[], item: Status):
    Promise<void>;
  selectLocalAccountByDigestOfCookie(digest: Buffer):
    Promise<LocalAccount | null>;
  selectLocalAccountById(id: string): Promise<LocalAccount | null>;

  selectMentionsIncludingActorsByNoteId(id: string): Promise<Mention[]>;

  insertNote(note: Note, inReplyToUri?: string | null): Promise<void>;
  selectNoteById(id: string): Promise<Note | null>;

  insertRemoteAccount(account: RemoteAccount): Promise<void>;
  selectRemoteAccountById(id: string): Promise<RemoteAccount | null>;
  selectRemoteAccountByKeyUri(uri: string): Promise<RemoteAccount | null>;

  deleteStatusByUriAndAttributedTo(uri: string, attributedTo: Actor):
    Promise<void>;
  selectRecentStatusesIncludingExtensionsByActorId(actorId: string):
    Promise<Status[]>;
  selectRecentStatusesIncludingExtensionsAndActorsFromInbox(actorId: string):
    Promise<Status[]>;
  selectStatusById(id: string): Promise<Status | null>;
  selectStatusIncludingExtensionById(id: string): Promise<Status | null>;

  subscribe(channel: string, listen: Listen): Promise<void>;
  unsubscribe(channel: string, listen: Listen): Promise<void>;

  deleteUnlinkedDocumentsByIds(ids: string[]): Promise<void>;
  selectUnlinkedDocuments(): Promise<{ id: string, key: string }>;

  selectURIById(id: string): Promise<URI | null>;
  selectAllocatedURI(uri: string): Promise<URI | null>;

  readonly analytics: Analytics;
  readonly captcha: Option.Captcha;
  readonly console: Syslog;
  readonly content: Option.Content;
  readonly document: Option.Document;
  readonly host: string;
  readonly fingerHost: string;
  readonly pg: Pg;
  readonly redis: RedisRepository;
  readonly s3: { service: S3, readonly bucket: string };
  readonly queue: Queue;
  protected listeners: { [channel: string]: Set<Listen> };
}
