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

import Entity from './entity';

class TestEntity extends Entity {}
TestEntity.query = 'query';

describe('constructor', () => {
  test('sets repository property', () => {
    const repository = {};
    const entity = new TestEntity(repository, null);

    expect(entity.repository).toBe(repository);
  });

  test('sets id property', () => {
    const id = {};
    const entity = new TestEntity(null, id);

    expect(entity.id).toBe(id);
  });

  test('sets get method which returns properties given to', () => {
    const properties = {};
    const entity = new TestEntity(null, null, properties);

    return expect(entity.get()).resolves.toBe(properties);
  });

  test('sets get method which query properties if those are not given', async () => {
    const id = {};
    const properties = {};
    const query = jest.fn(() => properties);
    const entity = new TestEntity({ query }, id);

    await expect(entity.get()).toBe(properties);
    expect(query).toHaveBeenCalledWith(entity);
  });

  test('sets get method which caches its result', async () => {
    const properties = {};
    const query = jest.fn(() => properties);
    const entity = new TestEntity({ query }, {});

    await expect(entity.get()).toBe(properties);
    await expect(entity.get()).toBe(properties);

    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe('selectComplete', () => test('resolves with itself', () => {
  const entity = new TestEntity(null, null);
  return expect(entity.selectComplete()).resolves.toBe(entity);
}));
