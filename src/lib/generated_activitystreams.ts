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

export interface Accept {
  type: string;
  object: Follow;
}

export interface Announce {
  type: string;
  id?: string;
  published: Date;
  object: string;
}

export type Any = Accept | Actor | Announce | Create |
Follow | Key | LocalActor | Note |
OrderedCollection | OrderedCollectionPage;

export interface Actor {
  id: string;
  preferredUsername: string;
  name: string;
  summary: string;
  inbox: string;
  outbox: string;
}

export interface Create {
  type: string;
  id?: string;
  object: Document | Note;
}

export interface Document {
  type: string;
  mediaType: string;
  url: string;
}

export interface Endpoints {
  proxyUrl: string;
  uploadMedia: string;
}

export interface Follow {
  type: string;
  actor: string;
  object: string;
}

export interface Hashtag {
  type: string;
  name: string;
}

export interface Key {
  id: string;
  type: string;
  owner: string;
  publicKeyPem: string;
}

export interface Like {
  type: string;
  object: string;
}

export interface LocalActor extends Actor {
  type: string;
  endpoints: Endpoints;
  publicKey: Key;
  'miniverse:salt': string;
}

export interface Mention {
  type: string;
  href: string;
}

export interface Note {
  type: string;
  id: string;
  published: Date;
  attributedTo: string;
  inReplyTo: string | null;
  to: string;
  summary: string | null;
  content: string;
  attachment: Document[];
  tag: (Hashtag | Mention)[];
}

export interface OrderedCollection {
  type: string;
  orderedItems: Any[];
}

export interface OrderedCollectionPage {
  type: string;
  orderedItems: Any[];
}
