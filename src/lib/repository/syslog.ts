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

import { format } from 'util';

/*
  RFC 5424 - The Syslog Protocol
  6.2.1. PRI
  https://tools.ietf.org/html/rfc5424#section-6.2.1
*/

export default class Syslog {
  private readonly console: Console;

  constructor(console: Console) {
    this.console = console;
  }

  error(string: unknown, ...args: unknown[]) {
    this.console.error(format(string, ...args).replace(/^/gm, '<3>'));
  }

  warn(string: unknown, ...args: unknown[]) {
    this.console.warn(format(string, ...args).replace(/^/gm, '<4>'));
  }

  info(string: unknown, ...args: unknown[]) {
    this.console.info(format(string, ...args).replace(/^/gm, '<6>'));
  }

  debug(string: unknown, ...args: unknown[]) {
    this.console.debug(format(string, ...args).replace(/^/gm, '<7>'));
  }
}
