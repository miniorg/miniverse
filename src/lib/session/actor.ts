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

import { OrderedCollection } from '../generated_activitystreams';
import { Account } from '../generated_webfinger';
import { postOutbox } from './fetch';
import Session from './types';

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

async function fetchActor({ endpoints, fingerHost }: Session, givenFetch: typeof fetch, acct: string) {
  const remote = acct.includes('@');
  const encodedAcct = encodeURIComponent(remote ?
    acct : `${acct}@${fingerHost}`);

  const finger = await givenFetch(
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
    givenFetch(endpoints.proxyUrl,
      { method: 'POST', headers, body: new URLSearchParams({ id: link.href }) }) :
    givenFetch(link.href, { headers }));

  return [404, 410].includes(activityStreams.status) ? null : activityStreams.json();
}

export { fetchActor as fetch }

export async function fetchOutbox(givenFetch: typeof fetch, actor: Actor) {
  const id = typeof actor.outbox == 'string' ? actor.outbox : actor.outbox.id;
  const fetched = await givenFetch(id, {
    headers: { Accept: 'application/activity+json;q=0.9,application/ld+json;q=0.8' }
  });

  const outbox = await fetched.json();

  outbox.id = id;
  actor.outbox = outbox;
}

export async function follow(session: Session, givenFetch: typeof fetch, { id }: Actor) {
  await postOutbox(session, givenFetch, {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Follow',
    object: id,
  });
}
