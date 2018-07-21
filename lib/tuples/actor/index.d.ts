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

import * as ActivityStreams from '../../generated_activitystreams';
import ParsedActivityStreams from '../../parsed_activitystreams';
import Repository from '../../repository';
import LocalAccount from '../local_account';
import Relation, { Reference } from '../relation';
import RemoteAccount from '../remote_account';
import Status from '../status';
import FromParsedActivityStreams from './from_parsed_activitystreams';
import Resolver from './resolver';

interface Properties {
  id?: string;
  username: string;
  host: string | null;
  name: string;
  summary: string;
}

interface References {
  account: LocalAccount | RemoteAccount | null;
  followers: Actor[];
  statuses: Status[];
}

type AnyActor = ActivityStreams.Actor | ActivityStreams.LocalActor;

export default class Actor extends Relation<Properties, References>
    implements FromParsedActivityStreams, Resolver {
  validate(): void;
  getUri(): Promise<string>;
  toActivityStreams(): Promise<AnyActor>;

  static createFromHostAndParsedActivityStreams(
    repository: Repository, host: string, object: ParsedActivityStreams):
      Promise<Actor>;
  static fromParsedActivityStreams(
    repository: Repository, object: ParsedActivityStreams): 
      Promise<Actor | null>;

  static resolveByUsernameAndNormalizedHost(
    repository: Repository, username: string, normalizedHost: string | null):
      Promise<Actor | null>;
  static resolveByKeyUri(repository: Repository, keyUri: string):
    Promise<Actor | null>;

  id?: string;
  readonly username: string;
  readonly host: string | null;
  readonly name: string;
  readonly summary: string;
  private account?: Reference<LocalAccount | RemoteAccount | null>;
  private followers?: Reference<Actor[]>;
  private statuses?: Reference<Status[]>;
}
