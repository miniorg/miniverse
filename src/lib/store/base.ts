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

import { Store as Base } from 'svelte/store';
import { Announce, Endpoints, Key, Note } from '../generated_activitystreams';

export interface Analytics {
  readonly trackingId?: string;
}

export interface User {
  id: string;
  preferredUsername: string;
  name: string;
  summary: string;
  inbox: string | (Announce | Note)[];
  outbox: string;
  type: string;
  endpoints: Endpoints;
  publicKey: Key;
  'miniverse:salt': string;
}

export interface Properties {
  readonly analytics: Analytics;
  readonly captcha: null | string;
  readonly endpoints: Endpoints;
  readonly nonce: null | string;
  readonly scripts: string[];
  readonly user: User | null;
  readonly fingerHost: string;
}

type SomeProperties = { readonly [key in keyof Properties]?: Properties[key] };

export default class Store extends Base {
  constructor(properties: Properties) {
    super(properties);
  }

  get() {
    return super.get() as Properties;
  }

  set(properties: SomeProperties) {
    super.set(properties);
  }
}
