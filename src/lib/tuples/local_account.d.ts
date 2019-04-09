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
import Status from './status';

interface Properties {
  id?: string;
  admin: boolean;
  privateKeyDer: Buffer;
  salt: Buffer;
  serverKey: Buffer;
  storedKey: Buffer;
}

interface References {
  inbox: Status[];
  actor: Actor | null;
}

interface WebFinger {
  subject: string;
  links: { rel: 'self', type: 'application/activity+json', href: 'string' }[];
}

export default class LocalAccount extends Relation<Properties, References> {
  toWebFinger(): Promise<WebFinger>;

  static create(
    repository: Repository,
    username: string,
    name: string,
    summary: string,
    admin: boolean,
    salt: Buffer,
    serverKey: Buffer,
    storedKey: Buffer);

  id?: string;
  readonly admin: boolean;
  readonly privateKeyDer: Buffer;
  readonly salt: Buffer;
  readonly serverKey: Buffer;
  readonly storedKey: Buffer;
  private inbox?: Reference<Status[]>;
  private actor?: Reference<Actor | null>;
}
