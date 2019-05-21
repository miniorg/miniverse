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

interface Descriptor<References, Key extends keyof References> {
  readonly id: Key;
  readonly inverseOf?: string;
  readonly query: Query<References, Key>;
}

type Query<References, Key extends keyof References> =
  (this: Descriptor<References, Key>, instance: Relation<any, References>) =>
  Promise<References[Key]>;

function getPropertyOf<Properties, Key extends keyof Properties>(relation: Relation<Properties, any>, key: Key) {
  return (relation as any)[key] as Properties[Key];
}

function getTypeOf<References>(relation: Relation<any, References>) {
  return relation.constructor as unknown as ({
    readonly references: {
      readonly [key: string]: Descriptor<References, any> | undefined;
    };
  });
}

function getReferenceOf<References, Key extends keyof References>(relation: Relation<any, References>, key: Key) {
  return (getTypeOf(relation).references as any)[key] as Descriptor<References, Key>;
}

function getReferencedBy<References, Key extends keyof References>(relation: Relation<any, References>, key: Key) {
  return (relation as any)[key] as Reference<References[Key] & Relation<unknown, unknown> & { readonly id: string }> | undefined;
}

function setPropertyOf<Properties, Key extends keyof Properties>(relation: Relation<Properties, any>, key: Key, value: Properties[Key]) {
  (relation as any)[key] = value;
}

function setReferencedBy<References, Key extends keyof References>(relation: Relation<any, References>, key: Key, value: Reference<References[Key]>) {
  (relation as any)[key] = value;
}

export type Reference<T> = Promise<T> | T;

export default class Relation<Properties, References> {
  static references: { readonly [key: string]: unknown };
  protected readonly repository!: Repository;

  constructor(properties: {
    readonly repository: Repository;
  } & {
    readonly [Key in keyof Properties]: Properties[Key];
  } & {
    readonly [Key in keyof References]?: References[Key];
  }) {
    Object.assign(this, properties);

    for (const key in getTypeOf(this).references) {
      const keyOfReferences = key as keyof References;
      const referenced = getReferencedBy(this, keyOfReferences);

      if (referenced) {
        const reference = getReferenceOf(this, keyOfReferences);

        if (!reference) {
          throw new Error('Reference cannot be found');
        }

        setPropertyOf<Properties, any>(this, reference.id, (referenced as { readonly id: string }).id as any);

        if (reference.inverseOf) {
          setReferencedBy(referenced as Relation<any, any>, reference.inverseOf, this);
        }
      }
    }
  }

  async select<Key extends keyof References>(key: Key): Promise<References[Key]> {
    const referenced = getReferencedBy(this, key);

    if (referenced) {
      return referenced;
    }

    const reference = getReferenceOf(this, key);
    const query = reference.query(this);

    setReferencedBy(this, key, query);

    const queried = await query;

    if (reference.inverseOf) {
      for (const element of Array.isArray(queried) ? queried : [queried]) {
        element[reference.inverseOf] = this;
      }
    }

    return queried;
  }

  static withRepository(query: keyof Repository): Query<any, any> {
    return function(instance) {
      const { repository } = instance;
      const method = repository[query] as (this: Repository, key: unknown) => Promise<unknown>;
      return method.call(repository, getPropertyOf(instance, this.id));
    };
  }
}
