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
import { Properties } from '../lib/store/base';
import Store from '../lib/store/browser';

type GA = ((...a: unknown[]) => void) & { q: unknown[] };

declare global {
  interface Window {
    ga: GA;
  }

  const ga: GA;
}

window.ga = function() {
  window.ga.q.push(arguments);
} as GA;

ga.q = [];

addEventListener('error', ({ message, filename }) => {
  ga('send', 'event', 'Runtime script error', filename, message);
});

addEventListener('unhandledrejection', ({ reason }) => {
  ga('send', 'event', 'Unhandled promise rejection', null, reason);
});

document.addEventListener('securitypolicyviolation', ({ blockedURI, violatedDirective }) => {
  ga(
    'send',
    'event',
    'Security Policy Violation',
    violatedDirective,
    blockedURI,
    { nonInteraction: true });
});

export default function(target: HTMLElement) {
  return start({
    target,
    store(data: Properties) {
      return new Store(data);
    }
  });
}
