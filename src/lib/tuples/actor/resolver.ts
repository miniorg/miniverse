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
import Repository from '../../repository';
import { fetch } from '../../transfer';
import { encodeAcctUserpart } from '../uri';
import Base from './base';

export async function lookup(repository: Repository, resource: string) {
  const { pathname, protocol, origin } = new URL(resource);

  const webFingerOrigin = protocol == 'acct:' ?
    'https://' + pathname.split('@', 2)[1] : origin;

  const webFingerResource = encodeURIComponent(resource);

  const response = await fetch(
    repository,
    `${webFingerOrigin}/.well-known/webfinger?resource=${webFingerResource}`);

  return response.json() as { [key: string]: unknown };
}

export default class extends Base {
  static async fromUsernameAndNormalizedHost(repository: Repository, username: string, normalizedHost: null | string) {
    const actor = await repository.selectActorByUsernameAndNormalizedHost(
      username, normalizedHost);

    if (normalizedHost) {
      if (actor) {
        return actor;
      }

      const encodedUsername = encodeAcctUserpart(username);
      const firstFinger =
        await lookup(repository, `acct:${encodedUsername}@${normalizedHost}`);

      if (typeof firstFinger.subject != 'string') {
        throw new CustomError('Invalid WebFinger subject', 'error');
      }

      if (!Array.isArray(firstFinger.links)) {
        throw new CustomError('Invalid WebFinger links', 'error');
      }

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
  }

  static async fromKeyUri(repository: Repository, keyUri: string) {
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
    if (!owner) {
      throw new CustomError('Key owner not found.', 'error');
    }

    const ownedKey = await owner.getPublicKey();
    if (!ownedKey) {
      throw new CustomError('Key owner\'s key not found.', 'error');
    }

    const ownedKeyUri = await ownedKey.getId();

    if (ownedKeyUri != keyUri) {
      throw new CustomError(
        'Key id mismatches. Possibly invalid Activity Streams?',
        'info');
    }

    return this.fromParsedActivityStreams(repository, owner);
  }
}
