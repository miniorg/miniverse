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
import { Custom as CustomError } from '../../errors';
import ParsedActivityStreams, { AnyHost } from '../../parsed_activitystreams';
import { fetch } from '../../transfer';
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
  async fromUsernameAndNormalizedHost(repository, username, normalizedHost) {
    const actor = await repository.selectActorByUsernameAndNormalizedHost(
      username, normalizedHost);

    if (normalizedHost) {
      if (actor) {
        return actor;
      }

      const encodedUsername = encodeAcctUserpart(username);
      const firstFinger =
        await lookup(repository, `acct:${encodedUsername}@${normalizedHost}`);

      const host = firstFinger.subject.split('@', 2)[1];
      const { href } = firstFinger.links.find(({ rel }) => rel == 'self');
      const activityStreams =
        new ParsedActivityStreams(repository, href, AnyHost);

      await lookup(repository, href).then(secondFinger => {
        if (firstFinger.subject != secondFinger.subject) {
          throw new CustomError(
            'WebFinger subject verification failed. Possibly invalid WebFinger?',
            'info');
        }
      });

      return this.createFromHostAndParsedActivityStreams(
        repository, host, activityStreams);
    }

    return actor;
  },

  async fromKeyUri(repository, keyUri) {
    const keyUriEntity = await repository.selectAllocatedURI(keyUri);

    if (keyUriEntity) {
      const account =
        await repository.selectRemoteAccountByKeyUri(keyUriEntity);

      if (account) {
        return account.select('actor');
      }

      throw new CustomError(
        'Key URI entity not found. Possibly invalid URI or key deleted?',
        'info');
    }

    const key = new ParsedActivityStreams(repository, keyUri, AnyHost);
    const owner = await key.getOwner();
    const ownedKey = await owner.getPublicKey();
    const ownedKeyUri = await ownedKey.getId();

    if (ownedKeyUri != keyUri) {
      throw new CustomError(
        'Key id mismatches. Possibly invalid Activity Streams?',
        'info');
    }

    return this.fromParsedActivityStreams(repository, owner);
  }
};
