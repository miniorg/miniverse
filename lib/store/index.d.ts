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
import { Actor, LocalActor } from '../generated_activitystreams';
import StoreActor from './actor';
import Announce from './announce';
import Base from './base';
import Like from './like';
import Note from './note';

export default class extends Base implements StoreActor, Announce, Like, Note {
  fetchOutbox(fetch: Fetch, actor: Actor | LocalActor): Promise<void>;
  fetchActor(fetch: Fetch, acct: string): Promise<Actor | LocalActor>;

  announce(fetch: Fetch, object: string): Promise<void>;

  like(fetch: Fetch, object: string): Promise<void>;

  createNote(fetch: Fetch, content: string): Promise<void>;
}
