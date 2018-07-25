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

export type Accept = { type: string, object: Follow };

export type Announce = {
  type: string,
  id?: string,
  published: Date,
  object: string
};

export type Any = Accept | Actor | Announce | Create |
  Follow | Key | LocalActor | OrderedCollection |
  OrderedCollectionPage;

export type Actor = {
  id: string;
  preferredUsername: string;
  name: string;
  summary: string;
  inbox: string;
  outbox: string;
};

export type Create = { type: string, object: Note };

export type Document = { type: string, mediaType: string, url: string };

export type Follow = { type: string, actor: string, object: string };

export type Hashtag = { type: string, name: string };

export type Key = {
  id: string,
  type: string,
  owner: string,
  publicKeyPem: string
};

export type Like = { type: string, object: string };

export type LocalActor = Actor & {
  type: string;
  endpoints: { proxyUrl: string };
  publicKey: Key;
  'miniverse:salt': string;
};

export type Mention = { type: string, href: string };

export type Note = {
  type: string;
  id: string;
  published: Date;
  attributedTo: string;
  inReplyTo: string;
  to: string;
  summary: string;
  content: string;
  tag: (Hashtag | Mention)[];
};

export type OrderedCollection = {
  type: string,
  orderedItems: Any
};

export type OrderedCollectionPage = {
  type: string,
  orderedItems: Any
};
