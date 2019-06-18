/*
  Copyright (C) 2019  Miniverse authors

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

describe('query', () => {
  test('aborts if AbortSignal says already aborted', () => {
    const controller = new AbortController;
    const { pg } = repository;
    const recovery = {};
    const { signal } = controller;

    controller.abort();

    return expect(pg.query('SELECT pg_wait(9)', signal, ({ name }) => {
      expect(name).toBe('AbortError');
      return recovery;
    })).rejects.toBe(recovery);
  });

  test('aborts query', () => {
    const controller = new AbortController;
    const { pg } = repository;
    const recovery = {};
    const { signal } = controller;

    const promise = pg.query('SELECT pg_wait(9)', signal, ({ name }) => {
      expect(name).toBe('AbortError');
      return recovery;
    });

    controller.abort();
    return expect(promise).rejects.toBe(recovery);
  });

  test('queries', async () => {
    const { pg } = repository;
    const recover = jest.fn();
    const { signal } = new AbortController;

    await expect(pg.query('SELECT', signal, recover))
      .resolves.toHaveProperty('command', 'SELECT');

    expect(recover).not.toHaveBeenCalled();
  });
});
