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
import fetch from '../fetch';
import ParsedActivityStreams,
       { AnyHost, TypeNotAllowed } from '../parsed_activitystreams';
import { encodeAcctUserpart } from '../uri';

export async function lookup(repository, resource) {
  const { pathname, protocol, origin } = new URL(resource);

  const webFingerOrigin = protocol == 'acct:' ?
    'https://' + pathname.split('@', 2)[1] : origin;

  const webFingerResource = encodeURIComponent(resource);

  const response = await fetch(
    repository,
    `${webFingerOrigin}/.well-known/webfinger?resource=${webFingerResource}`);

  return response.json();
}

export default {
  async resolveByUsernameAndNormalizedHost(repository, username, normalizedHost) {
    const person = await repository.selectPersonByUsernameAndNormalizedHost(
      username, normalizedHost);

    if (normalizedHost) {
      if (person) {
        return person;
      }

      const encodedUsername = encodeAcctUserpart(username);
      const firstFinger =
        await lookup(repository, `acct:${encodedUsername}@${normalizedHost}`);

      const host = firstFinger.subject.split('@', 2)[1];
      const { href } = firstFinger.links.find(({ rel }) => rel == 'self');
      const activityStreams =
        new ParsedActivityStreams(repository, href, AnyHost);

      await Promise.all([
        activityStreams.getType().then(type => {
          if (!type.has('Person')) {
            throw new TypeNotAllowed;
          }
        }),
        lookup(repository, href).then(secondFinger => {
          if (firstFinger.subject != secondFinger.subject) {
            throw new Error;
          }
        })
      ]);

      return this.fromHostAndParsedActivityStreams(
        repository, host, activityStreams);
    }

    return person;
  },

  async resolveByKeyUri(repository, keyUri) {
    const keyUriEntity = await repository.selectURI(keyUri);

    if (keyUriEntity) {
      const account =
        await repository.selectRemoteAccountByKeyUri(keyUriEntity);

      if (account) {
        return account.select('person');
      }

      throw new Error;
    }

    const key = new ParsedActivityStreams(repository, keyUri, AnyHost);
    const owner = await key.getOwner();
    const ownedKey = await owner.getPublicKey();
    const ownedKeyUri = await ownedKey.getId();

    if (ownedKeyUri != keyUri) {
      throw new Error;
    }

    return this.fromParsedActivityStreams(repository, owner);
  }
};
