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

import { Custom as CustomError } from '../errors';
import Repository from '../repository';
import Actor from '../tuples/actor';
import Resolver from './resolver';

interface Content {
  readonly resolver: Resolver;
  readonly context: any;
  readonly body?: any;
}

export const AnyHost: object;
export const NoHost: object;
export class TypeNotAllowed extends CustomError {}

export default class ParsedActivityStreams {
  constructor(
    repository: Repository,
    body: any,
    normalizedHost: any,
    parentContent?: Promise<Content>);
  getActor(): Promise<ParsedActivityStreams>;
  getAttributedTo(): Promise<ParsedActivityStreams>;
  getContent(): Promise<any>;
  getContext(): Promise<Set<any>>;
  getHref(): Promise<any>;
  getItems(): Promise<ParsedActivityStreams[]>;
  getId(): Promise<any>;
  getInbox(): Promise<ParsedActivityStreams>;
  getInReplyTo(): Promise<ParsedActivityStreams>;
  getName(): Promise<any>;
  getObject(): Promise<ParsedActivityStreams>;
  getOwner(): Promise<ParsedActivityStreams>;
  getPreferredUsername(): Promise<any>;
  getPublicKey(): Promise<ParsedActivityStreams>;
  getPublicKeyPem(): Promise<any>;
  getPublished(): Promise<Date>;
  getSummary(): Promise<any>;
  getTag(): Promise<ParsedActivityStreams[]>;
  getTo(): Promise<ParsedActivityStreams[]>;
  getType(): Promise<Set<any>>;
  act(actor: Actor): Promise<string | null>;

  readonly normalizedHost: string;
  readonly referenceId: any;
  content: Promise<Content> | null;
  readonly repository: Repository;
  readonly parentContent: Promise<Content>;
}
