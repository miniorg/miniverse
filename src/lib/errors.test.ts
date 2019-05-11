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

import { Custom, Temporary, wrap } from './errors';

describe('Custom', () => {
  describe('constructor', () => {
    test('handles severity', () => {
      const { message, severity } = new Custom('message', 'info');

      expect(message).toBe('info: message');
      expect(severity).toBe('info');
    });
  });

  describe('wrap', () => {
    test('sets given severity', () =>
      expect(Custom.wrap([], 'warn')).toHaveProperty('severity', 'warn'));

    test('sets severity error if given error is not Custom', () =>
      expect(Custom.wrap([new Error], 'error'))
        .toHaveProperty('severity', 'error'));

    test('sets originals property', () => {
      const originals = [] as Error[];
      expect(Custom.wrap(originals).originals).toBe(originals);
    });
  });
});

describe('wrap', () => {
  test('uses Custom constructor if none of given errors is Temporary', () => {
    const error = wrap([]);
    expect(error).toBeInstanceOf(Custom);
    expect(error).not.toBeInstanceOf(Temporary);
  });

  test('uses Temporary constructor if some of given errors is Temporary', () => {
    const error = wrap([new Temporary('message', 'info')]);
    expect(error).toBeInstanceOf(Temporary);
  });
});
