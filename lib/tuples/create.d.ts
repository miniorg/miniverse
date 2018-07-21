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

import { Create as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams from '../parsed_activitystreams';
import Repository from '../repository';
import Actor from './actor';
import Note from './note';
import Relation, { Reference } from './relation';

interface References {
  object: Note | null;
}

type Properties = { objectId: string } | { objectId?: string, object: Note };

export function create(
  this: void,
  repository: Repository,
  attributedTo: Actor,
  object: ParsedActivityStreams): Promise<Note>;

export default class Create extends Relation<Properties, References> {
  toActivityStreams(): Promise<ActivityStreams>;
  static createFromParsedActivityStreams(
    repository: Repository, activity: ParsedActivityStreams, actor: Actor):
      Promise<Create>;

  readonly objectId: string;
  private object?: Reference<Note | null>;
}
