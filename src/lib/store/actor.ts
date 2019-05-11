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

import { Fetch } from 'isomorphism';
import { URLSearchParams } from 'url';
import { OrderedCollection } from '../generated_activitystreams';
import { Account } from '../generated_webfinger';
import Base from './base';
import { postOutbox } from './fetch';

const headers = {
  Accept: 'application/activity+json;q=0.9,application/ld+json;q=0.8'
};

interface Actor {
  id: string;
  preferredUsername: string;
  name: string;
  summary: string;
  inbox: string;
  outbox: OrderedCollection & { readonly id: string } | string;
}

export default class extends Base {
  async fetchOutbox(fetch: Fetch, actor: Actor) {
    const id = typeof actor.outbox == 'string' ? actor.outbox : actor.outbox.id;
    const fetched = await fetch(id, {
      headers: { Accept: 'application/activity+json;q=0.9,application/ld+json;q=0.8' }
    });

    const outbox = await fetched.json();

    outbox.id = id;
    actor.outbox = outbox;
  }

  async fetchActor(fetch: Fetch, acct: string) {
    const remote = acct.includes('@');
    const encodedAcct = encodeURIComponent(remote ?
      acct : `${acct}@${this.get().fingerHost}`);

    const finger = await fetch(
      '/.well-known/webfinger?resource=acct:' + encodedAcct);

    if ([404, 410].includes(finger.status)) {
      return null;
    }

    const { links } = await finger.json() as Account;
    const link = links.find(({ rel }) => rel == 'self');
    if (!link) {
      return null;
    }

    const activityStreams = await (remote ?
      fetch(this.get().endpoints.proxyUrl,
        { method: 'POST', headers, body: new URLSearchParams({ id: link.href }) }) :
      fetch(link.href, { headers }));

    return [404, 410].includes(activityStreams.status) ? null : activityStreams.json();
  }

  follow(fetch: Fetch, { id }: Actor) {
    return postOutbox.call(this, fetch, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Follow',
      object: id,
    });
  }
}
