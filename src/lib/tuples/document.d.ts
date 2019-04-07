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

import { Document as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams from '../parsed_activitystreams';
import Repository from '../repository';
import Relation, { Reference } from './relation';
import URI from './uri';

interface References {
  url: URI | null;
}

type Properties = { id?: string, uuid: string, format: string };

export default class Document extends Relation<Properties, References> {
  toActivityStreams(): Promise<ActivityStreams>;
  static create(repository: Repository, url: string): Promise<Document>;
  static fromParsedActivityStreams(
    repository: Repository, ParsedActivityStreams): Promise<Document>;

  id?: string;
  readonly uuid: string;
  readonly format: string;
  private url?: Reference<URI | null>;
}
