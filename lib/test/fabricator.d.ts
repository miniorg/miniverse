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

import Repository from '../repository';
import Accept from '../tuples/accept';
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

interface URIProperties {
  readonly id?: string;
  readonly uri?: string;
  readonly allocated?: true;
}

interface StatusProperties {
  readonly uri?: URIProperties | null;
  readonly actor?: Actor;
  readonly published?: Date;
}

export function fabricateAccept(properties?: {
  readonly repository?: Repository,
  readonly object?: Follow
}): Promise<Accept>;

export function fabricateAnnounce(properties?: {
  readonly repository?: Repository,
  readonly status?: StatusProperties,
  readonly object?: Note
}): Promise<Announce>;

export function fabricateChallenge(properties?: {
  readonly repository?: Repository,
  readonly digest?: Buffer
}): Promise<Challenge>;

export function fabricateCookie(properties?: {
  readonly repository?: Repository,
  readonly account?: LocalAccount,
  readonly digest?: Buffer
}): Promise<Cookie>;

export function fabricateDocument(properties?: {
  readonly repository?: Repository,
  readonly uuid?: string,
  readonly format?: string,
  readonly uri?: URIProperties,
}): Promise<Document>;

export function fabricateFollow(properties?: {
  readonly repository?: Repository,
  readonly actor?: Actor,
  readonly object?: Actor
}): Promise<Follow>;

export function fabricateLike(properties?: {
  readonly repository?: Repository,
  readonly actor?: Actor,
  readonly object?: Note
}): Promise<Like>;

export function fabricateLocalAccount(properties?: {
  readonly repository?: Repository,
  readonly actor?: {
    readonly username?: string,
    readonly host?: null,
    readonly name?: string,
    readonly summary?: string
  },
  readonly admin?: boolean,
  readonly privateKeyPem?: string,
  readonly salt?: Buffer,
  readonly serverKey?: Buffer,
  readonly storedKey?: Buffer
}): Promise<LocalAccount>;

export function fabricateNote(properties?: {
  readonly repository?: Repository,
  readonly status?: StatusProperties,
  readonly inReplyToId?: string,
  readonly summary?: string | null,
  readonly content?: string,
  readonly attachments?: Document[],
  readonly hashtags?: { readonly name?: string }[],
  readonly mentions?: { readonly href?: Actor }[]
}): Promise<Note>;

export function fabricateRemoteAccount(properties?: {
  readonly repository?: Repository,
  readonly actor?: {
    readonly username?: string,
    readonly host?: string,
    readonly name?: string,
    readonly summary?: string
  },
  readonly uri?: URIProperties,
  readonly inboxURI?: URIProperties,
  readonly publicKeyURI?: URIProperties,
  readonly publicKeyPem?: string;
}): Promise<RemoteAccount>;
