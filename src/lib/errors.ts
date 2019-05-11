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

export type Severity = 'info' | 'warn' | 'error';

export class Custom extends Error {
  severity: Severity;
  originals: Error[] | null;

  constructor(message: unknown, severity: Severity, originals: Error[] | null = null) {
    super(`${severity}: ${message}`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.severity = severity;
    this.originals = originals;
  }

  log(repository: Repository) {
    repository.console[this.severity](this.stack);
  }

  static wrap(originals: Error[], severity?: Severity) {
    if (!severity) {
      severity = originals.reduce((current, original) => {
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
      }, 'info' as string) as Severity;
    }

    const wrapped = new this(originals, severity, originals);
    return wrapped;
  }
}

export class Temporary extends Custom {
  constructor(message: unknown, severity: Severity, originals: Error[] | null = null) {
    super(message, severity, originals);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function wrap(originals: Error[], severity?: Severity) {
  const temporary = originals.some(original => original instanceof Temporary);
  const Constructor = temporary ? Temporary : Custom;

  return Constructor.wrap(originals, severity);
}
