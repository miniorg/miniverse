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

import { Fetch } from 'isomorphism';
import Universal from '..';
import Session from './session';
import MiniverseEventSource from './event_source';

export default class Store extends Universal
  implements MiniverseEventSource, Session {
  readonly listenEventSource!: () => void;

  readonly signin!: (fetch: Fetch, username: string, password: string) => Promise<void>;
  readonly signup!: (
    fetch: Fetch,
    username: string,
    password: string,
    captcha: string) => Promise<void>;
}

for (const Constructor of [Session, MiniverseEventSource]) {
  for (const key of Object.getOwnPropertyNames(Constructor.prototype)) {
    (Store.prototype as any)[key] = (Constructor.prototype as any)[key];
  }
}
