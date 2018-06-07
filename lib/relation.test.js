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

import Relation from './relation';

describe('constructor', () => {
  test('sets properties', () => {
    class C extends Relation {}
    C.references = { reference: { id: 'id' } };

    const property = {};
    const i = new C({ property });
    expect(i.property).toBe(property);
  });

  test('does not throw even if referenced object is not provided', () => {
    class C extends Relation {}
    C.references = { reference: { id: 'id' } };

    expect(() => new C).not.toThrow()
  });

  test('sets id property', () => {
    class C extends Relation {}
    C.references = { reference: { id: 'id' } };

    const id = {};
    const i = new C({ reference: { id } });
    expect(i.id).toBe(id);
  });

  test('does not set undefined if inverse property does not exist', () => {
    const reference = {};

    class C extends Relation {}
    C.references = { reference: { id: 'id' } };

    new C({ reference });
    expect('undefined' in reference).toBe(false);
  });

  test('sets inverse property', () => {
    const reference = {};

    class C extends Relation {}
    C.references = { reference: { id: 'id', inverseOf: 'inverseOf' } };

    const i = new C({ reference });
    expect(reference.inverseOf).toBe(i);
  });
});

describe('select', () => {
  test('caches', async () => {
    const reference = {};
    const query = jest.fn(() => reference);

    class C extends Relation {}
    C.references = { reference: { query, id: 'id' } };

    const i = new C({});
    await expect(i.select('reference')).resolves.toBe(reference);
    await expect(i.select('reference')).resolves.toBe(reference);
    expect(query).toHaveBeenCalledTimes(1);
  });

  test('does not set undefined if inverse property does not exist', async () => {
    const reference = {};

    class C extends Relation {}
    C.references = {
      reference: {
        query() {
          return reference;
        },
        id: 'id'
      }
    };

    const i = new C({});
    await expect(i.select('reference')).resolves.toBe(reference);
    expect('undefined' in reference).toBe(false);
  });

  test('sets inverse property', async () => {
    const reference = {};

    class C extends Relation {}
    C.references = {
      reference: {
        query() {
          return reference;
        },
        id: 'id',
        inverseOf: 'inverseOf'
      }
    };

    const i = new C({});
    await expect(i.select('reference')).resolves.toBe(reference);
    expect(reference.inverseOf).toBe(i);
  });

  test('calls query with instance', async () => {
    const query = jest.fn();

    class C extends Relation {}
    C.references = { reference: { query, id: 'id' } };

    const i = new C({});
    await i.select('reference');
    expect(query).toHaveBeenCalledWith(i);
  });
});

test('caches and returns reference given to constructor', () => {
  class C extends Relation {}
  C.references = { reference: { id: 'id' } };

  const reference = {};
  const i = new C({ reference });
  return expect(i.select('reference')).resolves.toBe(reference);
});
