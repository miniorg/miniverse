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
import Actor from './actor';
import Relation, { Reference } from './relation';
import URI from './uri';

interface References {
  actor: Actor | null;
  uri: URI | null;
  inboxURI: URI | null;
  publicKeyURI: URI | null;
}

interface WebFinger {
  subject: string;
  links: { rel: string, type: string, href: string }[];
}

type Properties = { id?: string, publicKeyDer: Buffer } &
  ({ inboxURIId: string } | { inboxURIId?: string, inboxURI: URI }) &
  ({ publicKeyURIId: string } | { publicKeyURIId?: string, publicKeyURI: URI });

export default class RemoteAccount extends Relation<Properties, References> {
  toWebFinger(): Promise<WebFinger>;

  static create(
    repository: Repository,
    username: string,
    host: string,
    name: string,
    summary: string,
    uri: string,
    inbox: { uri: string },
    publicKey: { uri: string, publicKeyDer: Buffer }): Promise<RemoteAccount>;

  id?: string;
  private uri?: Reference<URI | null>;
  readonly inboxURIId: string;
  private inboxURI: Reference<URI | null>;
  readonly publicKeyURIId: string;
  private publicKeyURI: Reference<URI | null>;
  readonly publicKeyDer: Buffer;
}
