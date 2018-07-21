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
import { Key } from './generated_activitystreams';
import Relation, { Reference } from './relation';
import Repository from './repository';

type Properties = { ownerId: string } | { ownerId?: string, owner: Actor };
type Signature = {};

export function generate(this: void): string;

export default class extends Relation<Properties, { owner: Actor | null }> {
  getUri(): Promise<string>;
  verifySignature(signature: Signature): Promise<boolean>;
  selectPrivateKeyPem(): Promise<string>;
  toActivityStreams(): Promise<Key>;

  readonly ownerId: string;
  private owner?: Reference<Actor | null>;
}
