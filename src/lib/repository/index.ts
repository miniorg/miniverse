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

import { Pool } from 'pg';
import { Analytics } from '../session/types';
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
import DirtyDocuments from './dirty_documents';
import Documents from './documents';
import Follows from './follows';
import Hashtags from './hashtags';
import Likes from './likes';
import LocalAccounts from './local_accounts';
import Mentions from './mentions';
import RemoteAccounts from './remote_accounts';
import Notes from './notes';
import Statuses from './statuses';
import Subscribers, { Listen } from './subscribers';
import Syslog from './syslog';
import UnlinkedDocuments from './unlinked_documents';
import URIs from './uris';
import Bull = require('bull');
import Redis = require('ioredis');
import S3 = require('aws-sdk/clients/s3');

interface Captcha {
  readonly secret: string | null;
  readonly site: string | null;
  readonly verifier: string | null;
}

interface Content {
  readonly frame: { readonly sourceList?: string };
  readonly image: { readonly sourceList?: string };
  readonly script: { readonly sourceList?: string; readonly sources: string[] };
}

export interface Options {
  readonly analytics: Analytics;
  readonly captcha: Captcha;
  readonly console: Console;
  readonly content: Content;
  readonly host: string;
  readonly fingerHost?: string;
  readonly pg: Pool;
  readonly redis: { readonly prefix?: string; readonly url?: string };
  readonly s3: {
    readonly service: S3;
    bucket: string;
    readonly keyPrefix: string;
    readonly urlPrefix: string;
  };
}

interface RedisRepository {
  readonly prefix: string;
  readonly url?: string;
  readonly client: Redis.Redis;
  readonly subscriber: Redis.Redis;
}

export default class Repository implements
    Actors, Announces, Challenges, Cookies,
    DirtyDocuments, Documents, Follows, Hashtags,
    Likes, LocalAccounts, Mentions, Notes,
    RemoteAccounts, Statuses, Subscribers, UnlinkedDocuments,
    URIs {
  constructor({ analytics, captcha, console, content, host, fingerHost, pg, s3, redis }: Options) {
    this.analytics = analytics;
    this.captcha = captcha;
    this.console = new Syslog(console);
    this.content = content;
    this.listeners = Object.create(null);
    this.host = host;
    this.fingerHost = fingerHost || host;
    this.pg = pg;
    this.s3 = s3;
  
    this.redis = {
      prefix: redis.prefix || 'miniverse:',
      url: redis.url,
      client: new Redis(redis.url),
      subscriber: new Redis(redis.url)
    };
  
    this.queue = new Bull('HTTP', {
      createClient: (function(this: RedisRepository, type: 'bclient' | 'client' | 'subscriber') {
        switch (type) {
          case 'bclient':
            return new Redis(this.url);

          case 'client':
            return this.client;
  
          case 'subscriber':
            return this.subscriber;
        }
      }).bind(this.redis),
      prefix: this.redis.prefix + 'bull'
    });
  
    this.redis.subscriber.on('message', (channel, message) => {
      for (const listen of this.listeners[channel]) {
        listen(channel, message);
      }
    });
  }

  readonly selectActorById!:
  (id: string) => Promise<Actor | null>;
  readonly selectActorByUsernameAndNormalizedHost!:
  (username: string, normalizedHost: string | null) => Promise<Actor | null>;
  readonly selectActorsByFolloweeId!:
  (id: string) => Promise<Actor[]>;
  readonly selectActorsMentionedByNoteId!:
  (id: string) => Promise<Actor[]>;

  readonly insertAnnounce!: (announce: Announce & {
    readonly status: Status & { readonly uri: URI };
  }, recover: (error: Error) => unknown) => Promise<void>;

  readonly insertChallenge!:
  (challenge: Challenge) => Promise<void>;
  readonly selectChallengeByDigest!:
  (digest: Buffer) => Promise<Challenge | null>;

  readonly insertCookie!:
  (cookie: Cookie) => Promise<void>;

  readonly insertDocument!:
  (document: Document & { readonly url: URI }, dirtyId: number, recover: (error: Error) => unknown) => Promise<void>;
  readonly selectDocumentById!:
  (id: string) => Promise<Document | null>;
  readonly selectDocumentsByAttachedNoteId!:
  (id: string) => Promise<Document[]>;

  readonly deleteFollowByActorAndObject!:
  (actor: Actor, object: Actor) => Promise<void>;
  readonly insertFollow!:
  (follow: Follow, recover: (error: Error) => unknown) => Promise<void>;
  readonly selectFollowIncludingActorAndObjectById!:
  (id: string) => Promise<Follow | null>;

  readonly selectHashtagsByNoteId!:
  (noteId: string) => Promise<Hashtag[]>;

  readonly deleteLikeByActorAndObject!:
  (actor: Actor, object: Note) => Promise<void>;
  readonly insertLike!:
  (like: Like, recover: (error: Error) => unknown) => Promise<void>;
  readonly selectLikeById!:
  (id: string) => Promise<Like | null>;

  readonly getInboxChannel!:
  (accountOrActor: LocalAccount | Actor) => string;
  readonly insertLocalAccount!:
  (account: LocalAccount, recover: (error: Error) => unknown) => Promise<void>;
  readonly insertIntoInboxes!:
  (accountOrActors: (LocalAccount | Actor)[], item: Status) => Promise<void>;
  readonly selectLocalAccountByDigestOfCookie!:
  (digest: Buffer) => Promise<LocalAccount | null>;
  readonly selectLocalAccountById!:
  (id: string) => Promise<LocalAccount | null>;

  readonly selectMentionsIncludingActorsByNoteId!:
  (id: string) => Promise<Mention[]>;

  readonly insertNote!:
  (note: Note, inReplyToUri: string | null, recover: (error: Error) => unknown) => Promise<void>;
  readonly selectNoteById!:
  (id: string) => Promise<Note | null>;

  readonly insertRemoteAccount!:
  (account: RemoteAccount) => Promise<void>;
  readonly selectRemoteAccountById!:
  (id: string) => Promise<RemoteAccount | null>;
  readonly selectRemoteAccountByKeyUri!:
  (uri: URI) => Promise<RemoteAccount | null>;

  readonly deleteStatusByUriAndAttributedTo!:
  (uri: URI, attributedTo: Actor) => Promise<void>;
  readonly selectRecentStatusesIncludingExtensionsByActorId!:
  (actorId: string) => Promise<Status[]>;
  readonly selectRecentStatusesIncludingExtensionsAndActorsFromInbox!:
  (actorId: string) => Promise<Status[]>;
  readonly selectStatusById!:
  (id: string) => Promise<Status | null>;
  readonly selectStatusIncludingExtensionById!:
  (id: string) => Promise<Status | null>;

  readonly subscribe!:
  (channel: string, listen: Listen) => Promise<void>;
  readonly unsubscribe!:
  (channel: string, listen: Listen) => Promise<void>;

  readonly deleteUnlinkedDocumentsByIds!:
  (ids: string[]) => Promise<void>;
  readonly selectUnlinkedDocuments!:
  () => Promise<{ id: string; uuid: string; format: string }[]>;

  readonly deleteDirtyDocument!:
  (id: number) => Promise<void>;
  readonly insertDirtyDocument!:
  (this: Repository, document: Document) => Promise<number>;

  readonly selectURIById!:
  (id: string) => Promise<URI | null>;
  readonly selectAllocatedURI!:
  (uri: string) => Promise<URI | null>;

  readonly analytics: Analytics;
  readonly captcha: Captcha;
  readonly console: Syslog;
  readonly content: Content;
  readonly host: string;
  readonly fingerHost: string;
  readonly pg: Pool;
  readonly redis: RedisRepository;
  readonly s3: {
    readonly service: S3;
    bucket: string;
    readonly keyPrefix: string;
    readonly urlPrefix: string;
  };
  readonly queue: Bull.Queue;
  protected listeners: { [channel: string]: Set<Listen> };
}

for (const Constructor of [
  Actors, Announces, Challenges, Cookies,
  Documents, Follows, Hashtags, Likes,
  LocalAccounts, Mentions, RemoteAccounts, Notes,
  Statuses, Subscribers, UnlinkedDocuments, URIs
]) {
  for (const key of Object.getOwnPropertyNames(Constructor.prototype)) {
    (Repository.prototype as any)[key] = (Constructor.prototype as any)[key];
  }
}
