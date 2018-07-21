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

import { Any } from '../generated_activitystreams';
import LocalAccount from '../local_account';
import URI from '../uri';
import Repository from '../repository';

export default function(
  this: void,
  repository: Repository,
  sender: LocalAccount,
  inboxURI: URI,
  object: { toActivityStreams(): Promise<Any> }): Promise<void>;
