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

import { Accept as ActivityStreams } from '../generated_activitystreams';
import Repository from '../repository';
import Follow from './follow';
import Relation, { Reference } from './relation';

interface References {
  object: Follow | null;
}

type Properties = { objectId: string } | { objectId?: string, object: Follow };

export default class Accept extends Relation<Properties, References> {
  toActivityStreams(): Promise<ActivityStreams>;
  static create(repository: Repository, object: Follow): Promise<Accept>;

  readonly objectId: string;
  private object?: Reference<Follow | null>;
}
