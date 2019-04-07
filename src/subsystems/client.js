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

import { start } from '../../__sapper__/client';
import Store from '../lib/store/browser';

/* eslint-disable no-global-assign */
// @ts-ignore
ga = function() {
  ga.q.push(arguments);
};
/* eslint-enable no-global-assign */

ga.q = [];

addEventListener('error', ({ message, filename }) => {
  // @ts-ignore
  ga('send', 'event', 'Runtime script error', filename, message);
});

addEventListener('unhandledrejection', ({ reason }) => {
  // @ts-ignore
  ga('send', 'event', 'Unhandled promise rejection', null, reason);
});

document.addEventListener('securitypolicyviolation', ({ blockedURI, violatedDirective }) => {
  // @ts-ignore
  ga(
    'send',
    'event',
    'Security Policy Violation',
    violatedDirective,
    blockedURI,
    { nonInteraction: true });
});

export default target => start({
  target,
  store(data) {
    return new Store(data);
  }
});
