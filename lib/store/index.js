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
import Actor from './actor';
import Announce from './announce';
import Like from './like';
import Note from './note';
import Session from './session';
import MiniverseEventSource from './event_source';

class Store extends Base {}

Object.assign(
  Store.prototype,
  Actor,
  Announce,
  Like,
  Note,
  Session,
  MiniverseEventSource);

export default Store;
