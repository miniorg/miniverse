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

export class Custom extends Error {
  constructor(message, severity, originals = null) {
    super(`${severity}: ${message}`);
    this.severity = severity;
    this.originals = originals;
  }

  log(repository) {
    repository.console[this.severity](this.stack);
  }

  static wrap(originals, severity) {
    if (!severity) {
      severity = originals.reduce((original, current) => {
        if (original instanceof Custom) {
          switch (original.severity) {
          case 'warn':
            if (current == 'info') {
              return 'warn';
            }

            return current;

          case 'error':
            return 'error';

          default:
            return current;
          }
        }

        return 'error';
      }, 'info');
    }

    const wrapper = new this(originals, severity, originals);
    return wrapper;
  }
}

export class Temporary extends Custom {}

export function wrap(originals, severity) {
  const temporary = originals.some(original => original instanceof Temporary);
  const Constructor = temporary ? Temporary : Custom;

  return Constructor.wrap(originals, severity);
}
