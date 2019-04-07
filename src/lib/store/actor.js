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

import { URLSearchParams } from 'url';
import Base from './base';
import { postOutbox } from './fetch';

const headers = {
  Accept: 'application/activity+json;q=0.9,application/ld+json;q=0.8'
};

export default class extends Base {
  async fetchOutbox(fetch, actor) {
    const fetched = await fetch(actor.outbox.id || actor.outbox, {
      headers: { Accept: 'application/activity+json;q=0.9,application/ld+json;q=0.8' }
    });

    const outbox = await fetched.json();

    outbox.id = actor.outbox.id;
    actor.outbox = outbox;
  }

  async fetchActor(fetch, acct) {
    const remote = acct.includes('@');
    const encodedAcct = encodeURIComponent(remote ?
      acct : `${acct}@${this.get().fingerHost}`);

    const finger = await fetch(
      '/.well-known/webfinger?resource=acct:' + encodedAcct);

    if ([404, 410].includes(finger.status)) {
      return null;
    }

    const { links } = await finger.json();
    const { href } = links.find(({ rel }) => rel == 'self');

    const activityStreams = await (remote ?
      fetch(this.get().user.endpoints.proxyUrl,
        { method: 'POST', headers, body: new URLSearchParams({ id: href }) }) :
      fetch(href, { headers }));

    return [404, 410].includes(activityStreams) ? null : activityStreams.json();
  }

  follow(fetch, { id }) {
    return postOutbox.call(this, fetch, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Follow',
      object: id,
    });
  }
}
