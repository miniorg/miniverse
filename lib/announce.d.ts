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
import { Announce as ActivityStreams } from './generated_activitystreams';
import Note from './note';
import ParsedActivityStreams from './parsed_activitystreams';
import Relation, { Reference } from './relation';
import Repository from './repository';
import Status from './status';

interface ObjectIdProperyties {
  objectId: string;
}

interface ObjectProperties {
  objectId?: string;
  object: Note;
}

interface References {
  status: Status | null;
  object: Note | null;
}

type Properties = { id?: string } & (ObjectIdProperyties | ObjectProperties);

export default class Announce extends Relation<Properties, References> {
  toActivityStreams(): Promise<ActivityStreams>;

  static create(
    repository: Repository,
    published: Date,
    actor: Actor,
    object: Note,
    uri?: string | null);

  static createFromParsedActivityStreams(
    repository: Repository,
    object: ParsedActivityStreams,
    actor: Actor);

  id?: string;
  readonly objectId: string;
  private status?: Reference<Status | null>;
  private object?: Reference<Note | null>;
}
