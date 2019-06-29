/*
  Copyright (C) 2019  Miniverse authors

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

export default interface Session {
  readonly analytics: Analytics;
  readonly endpoints: { readonly proxyUrl: string };
  readonly fingerHost: string;
  readonly nonce: string;
  readonly user: User | null;
}
