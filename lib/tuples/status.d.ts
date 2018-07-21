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

import Repository from '../repository';
import Actor from './actor';
import Announce from './announce';
import Note from './note';
import Relation, { Reference } from './relation';
import URI from './uri';

interface BaseProperties {
  id?: string;
  published: Date;
}

interface ActorIdProperties {
  actorId: string;
}

interface ActorProperties {
  actorId?: string;
  actor: Actor;
}

interface References {
  extension: Announce | Note | null;
  actor: Actor | null;
  uri: URI | null;
}

type Properties = BaseProperties & (ActorIdProperties | ActorProperties);

export default class Status extends Relation<Properties, References> {
  getUri(): Promise<string>;

  id?: string;
  readonly published: Date;
  readonly actorId: string;
  private actor?: Reference<Actor | null>;
  private extension?: Reference<Announce | Note | null>;
  private uri?: Reference<URI | null>;
}
