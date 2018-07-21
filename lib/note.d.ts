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
import { Note as ActivityStreams } from './generated_activitystreams';
import Hashtag from './hashtag';
import Mention from './mention';
import ParsedActivityStreams from './parsed_activitystreams';
import Relation from './relation';
import Repository from './repository';
import Status from './status';

interface Properties {
  id?: string;
  inReplyToId?: string | null;
  summary: string | null;
  content: string;
}

interface References {
  status: Status | null;
  hashtags: Hashtag[];
  mentions: Mention[];
}

interface Options {
  readonly uri?: string | null;
  readonly inReplyToId?: string | null;
  readonly inReplyToUri?: string | null;
  readonly summary?: string | null;
  readonly hashtags?: string[];
  readonly mentions?: Actor[];
}

export default class Note extends Relation<Properties, References> {
  toActivityStreams(): Promise<ActivityStreams>;
  validate(): void;

  static create(
    repository: Repository,
    published: Date,
    actor: Actor,
    content: string,
    options?: Options): Promise<Note>;
  static createFromParsedActivityStreams(
    repository: Repository,
    object: ParsedActivityStreams,
    givenAttributedTo?: Actor): Promise<Note>;
  static fromParsedActivityStreams(
    repository: Repository,
    object: ParsedActivityStreams,
    givenAttributedTo?: Actor): Promise<Note | null>;

  id?: string;
  readonly summary: string | null;
  readonly content: string;
  private status?: Status | null;
  private hashtags?: Hashtag[];
  private mentions?: Mention[];
}
