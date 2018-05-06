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

import { URL } from 'url';
import { promisify } from 'util';
import ActivityStreams from '../activitystreams';
import fetch from '../fetch';
import URI from '../uri';
const WebFinger = require('webfinger.js');

const webFinger = new WebFinger;
const lookup = promisify(webFinger.lookup.bind(webFinger));

async function getActivityStreams(repository, href) {
  const { host } = new URL(href);
  const response = await fetch(repository, href, {
    headers: { Accept: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"' }
  });
  const body = await response.json();
  const normalizedHost = URI.normalizeHost(host);
  const object = new ActivityStreams(body, normalizedHost);
  const type = await object.getType(repository);

  if (!type.has('Person')) {
    throw new Error;
  }

  return object;
}

export default {
  async resolveByUsernameAndNormalizedHost(repository, username, normalizedHost) {
    if (normalizedHost) {
      const account =
        await repository.selectRemoteAccountByUsernameAndNormalizedHost(
          username, normalizedHost);

      if (account) {
        return account.selectPerson(repository);
      }

      const encodedUsername = URI.encodeAcctUserpart(username);
      const firstFinger = await lookup(`${encodedUsername}@${normalizedHost}`);

      const host = firstFinger.object.subject.split('@', 2)[1];
      const { href } =
        firstFinger.object.links.find(({ rel }) => rel == 'self');

      const [activityStreams] = await Promise.all([
        getActivityStreams(repository, href),
        lookup(href).then(secondFinger => {
          if (firstFinger.object.subject != secondFinger.object.subject) {
            throw new Error;
          }
        })
      ]);

      return this.fromActivityStreams(repository, host, activityStreams);
    }

    const account = await repository.selectLocalAccountByUsername(username);

    return account.selectPerson(repository);
  },

  async resolveByKeyUri(repository, keyUri) {
    const account = await repository.selectRemoteAccountByKeyUri(keyUri);

    if (account) {
      return account.selectPerson(repository);
    }

    const object = await getActivityStreams(repository, keyUri);
    const asyncUri = object.getId();
    const [host] = await Promise.all([
      asyncUri.then(async uri => {
        const { object: { subject } } = await lookup(uri);
        const normalizedSubject = subject.replace(/^acct:/, '');
        const { object: { links } } = await lookup(normalizedSubject);

        if (links.every(({ href, rel }) => href != uri || rel != 'self')) {
          throw new Error;
        }

        return subject.split('@', 2)[1];
      }),
      object.getPublicKey(repository).then(key => key.getId()).then(result => {
        if (result != keyUri) {
          throw new Error;
        }
      })
    ]);

    return this.fromActivityStreams(repository, host, object);
  }
};
