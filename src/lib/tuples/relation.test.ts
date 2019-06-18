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

import { AbortController } from 'abort-controller';
import repository from '../test/repository';
import Relation from './relation';

const { signal } = new AbortController;

describe('constructor', () => {
  test('sets properties', () => {
    class C extends Relation<{ property: {} }, {}> {
      property!: {};
    }

    C.references = { reference: { id: 'id' } };

    const property = {};
    const i = new C({ repository, property });
    expect(i.property).toBe(property);
  });

  test('does not throw even if referenced object is not provided', () => {
    class C extends Relation<{}, {}> {}
    C.references = { reference: { id: 'id' } };

    expect(() => new C({ repository })).not.toThrow()
  });

  test('sets id property', () => {
    class C extends Relation<{}, { reference: { id: {} } }> {
      id!: {};
    }

    C.references = { reference: { id: 'id' } };

    const id = {};
    const i = new C({ repository, reference: { id } });
    expect(i.id).toBe(id);
  });

  test('does not set undefined if inverse property does not exist', () => {
    const reference = { id: {} };

    class C extends Relation<{}, { reference: { id: {} } }> {}
    C.references = { reference: { id: 'id' } };

    new C({ repository, reference });
    expect('undefined' in reference).toBe(false);
  });

  test('sets inverse property', () => {
    const reference: { id: {}; inverseOf?: C } = { id: {} };

    class C extends Relation<{}, { reference: { id: {}; inverseOf?: C } }> {}
    C.references = { reference: { id: 'id', inverseOf: 'inverseOf' } };

    const i = new C({ repository, reference });
    expect(reference.inverseOf).toBe(i);
  });
});

describe('select', () => {
  test('caches', async () => {
    const reference = {};
    const query = jest.fn(() => reference);

    class C extends Relation<{}, { reference: { id: {} } }> {}
    C.references = { reference: { query, id: 'id' } };

    const i = new C({ repository });
    const recover = jest.fn();
    await expect(i.select('reference', signal, recover))
      .resolves.toBe(reference);
    await expect(i.select('reference', signal, recover))
      .resolves.toBe(reference);
    expect(recover).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(1);
  });

  test('does not set undefined if inverse property does not exist', async () => {
    const reference = { id: {} };

    class C extends Relation<{}, { reference: { id: {} } }> {}
    C.references = {
      reference: {
        query() {
          return reference;
        },
        id: 'id'
      }
    };

    const i = new C({ repository });
    const recover = jest.fn();
    await expect(i.select('reference', signal, recover))
      .resolves.toBe(reference);
    expect(recover).not.toHaveBeenCalled();
    expect('undefined' in reference).toBe(false);
  });

  test('sets inverse property', async () => {
    const reference: { id: {}; inverseOf?: C } = { id: {} };

    class C extends Relation<{}, { reference: { id: {}; inverseOf?: C } }> {}
    C.references = {
      reference: {
        query() {
          return reference;
        },
        id: 'id',
        inverseOf: 'inverseOf'
      }
    };

    const i = new C({ repository });
    const recover = jest.fn();
    await expect(i.select('reference', signal, recover))
      .resolves.toBe(reference);
    expect(recover).not.toHaveBeenCalled();
    expect(reference.inverseOf).toBe(i);
  });

  test('calls query with instance', async () => {
    const query = jest.fn();

    class C extends Relation<{}, { reference: { id: {} } }> {}
    C.references = { reference: { query, id: 'id' } };

    const i = new C({ repository });
    const recover = jest.fn();
    await i.select('reference', signal, recover);
    expect(query).toHaveBeenCalledWith(i, signal, recover);
  });
});

test('caches and returns reference given to constructor', async () => {
  class C extends Relation<{}, { reference: { id: {} } }> {}
  C.references = { reference: { id: 'id' } };

  const reference = { id: {} };
  const i = new C({ repository, reference });
  const recover = jest.fn();
  await expect(i.select('reference', signal, recover))
    .resolves.toBe(reference);
  expect(recover).not.toHaveBeenCalled();
});
