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

import { AbortSignal } from 'abort-controller';
import { URL } from 'url';
import ParsedActivityStreams, { AnyHost } from '../../parsed_activitystreams';
import Repository, { conflict } from '../../repository';
import { fetch, temporaryError } from '../../transfer';
import { encodeAcctUserpart } from '../uri';
import Base, { unexpectedType } from './base';

export async function lookup(repository: Repository, resource: string, signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  const { pathname, protocol, origin } = new URL(resource);

  const webFingerOrigin = protocol == 'acct:' ?
    'https://' + pathname.split('@', 2)[1] : origin;

  const webFingerResource = encodeURIComponent(resource);

  const response = await fetch(
    repository,
    `${webFingerOrigin}/.well-known/webfinger?resource=${webFingerResource}`,
    { signal },
    recover);

  return response.json() as { [key: string]: unknown };
}

export default class extends Base {
  static async fromUsernameAndNormalizedHost(repository: Repository, username: string, normalizedHost: null | string, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const actor = await repository.selectActorByUsernameAndNormalizedHost(
      username, normalizedHost);

    if (normalizedHost) {
      if (actor) {
        return actor;
      }

      const encodedUsername = encodeAcctUserpart(username);
      const firstFinger =
        await lookup(repository, `acct:${encodedUsername}@${normalizedHost}`, signal, recover);

      if (typeof firstFinger.subject != 'string') {
        throw recover(new Error('Unsupported WebFinger subject type.'));
      }

      if (!Array.isArray(firstFinger.links)) {
        throw recover(new Error('Unsupported WebFinger links type.'));
      }

      const host = firstFinger.subject.split('@', 2)[1];
      const { href } = firstFinger.links.find(({ rel }) => rel == 'self');
      const activityStreams =
        new ParsedActivityStreams(repository, href, AnyHost);

      await lookup(repository, href, signal, recover).then(secondFinger => {
        if (firstFinger.subject != secondFinger.subject) {
          throw recover(new Error('WebFinger subject verification failed.'));
        }
      });

      let conflictError: Error | undefined;

      return this.createFromHostAndParsedActivityStreams(
        repository,
        host,
        activityStreams,
        signal,
        error => {
          if (error[conflict]) {
            conflictError = error;
            return error;
          }
 
          return recover(error);
        }
      ).catch(async error => {
        if (!conflictError) {
          throw error;
        }

        const actor = await repository.selectActorByUsernameAndNormalizedHost(
          username, normalizedHost);
        if (actor) {
          return actor;
        }

        throw recover(conflictError);
      });
    }

    return actor;
  }

  static async fromKeyUri(repository: Repository, keyUri: string, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const keyUriEntity = await repository.selectAllocatedURI(keyUri);

    if (keyUriEntity) {
      const account =
        await repository.selectRemoteAccountByKeyUri(keyUriEntity);

      if (account) {
        return account.select('actor');
      }

      throw recover(new Error('Key owner not found.'));
    }

    const key = new ParsedActivityStreams(repository, keyUri, AnyHost);
    const owner = await key.getOwner(signal, recover);
    if (!owner) {
      throw recover(new Error('Key owner unspecified.'));
    }

    const ownedKey = await owner.getPublicKey(signal, recover);
    if (!ownedKey) {
      throw recover(new Error('Key owner\'s key unspecified.'));
    }

    const ownedKeyUri = await ownedKey.getId(recover);

    if (ownedKeyUri != keyUri) {
      throw recover(new Error('Key id verification failed.'));
    }

    return this.fromParsedActivityStreams(repository, owner, signal, recover);
  }
}
