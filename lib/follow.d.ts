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

import Actor from './actor';
import { Follow as ActivityStreams } from './generated_activitystreams';
import ParsedActivityStreams from './parsed_activitystreams';
import Relation, { Reference } from './relation';
import Repository from './repository';

type Properties = { id?: number } &
  ({ actorId: string } | { actorId?: string, actor: Actor }) &
  ({ objectId: string } | { objectId?: string, object: Actor });

interface References {
  actor: Actor | null;
  object: Actor | null;
}

export default class Follow extends Relation<Properties, References> {
  toActivityStreams(): Promise<ActivityStreams>;

  static create(repository: Repository, actor: Actor, object: Actor);
  static createFromParsedActivityStreams(
    repository: Repository,
    activity: ParsedActivityStreams,
    actor: Actor): Promise<Follow>;

  id?: number;
  private actor?: Reference<Actor | null>;
  private object?: Reference<Actor | null>;
}
