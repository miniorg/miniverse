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

import Repository from './repository';

interface Descriptor<References, Key extends keyof References> {
  readonly id: Key;
  readonly inverseOf: string;
  readonly query: Query<References, Key>;
}

type Query<References, Key extends keyof References> =
  (this: Descriptor<References, Key>, instance: Relation<any, References>) =>
    Promise<References[Key]>;

export type Reference<T> = Promise<T> | T;

export default class Relation<Properties, References> {
  constructor(properties:
    { readonly repository: Repository } &
    { readonly [Key in keyof Properties]: Properties[Key] } &
    { readonly [Key in keyof References]?: References[Key] });
  select<Key extends keyof References>(key: Key): Promise<References[Key]>;

  readonly [key: string]: any;
  protected readonly repository: Repository;
}

export function withRepository(this: void, query: string): Query<any, any>;
