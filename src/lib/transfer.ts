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

import { createPrivateKey } from 'crypto';
import originalFetch, { FetchError, Request, RequestInit } from 'node-fetch';
import { sign } from 'http-signature';
import { domainToASCII } from 'url';
import Repository from './repository';
import Key from './tuples/key';
import LocalAccount from './tuples/local_account';
import RemoteAccount from './tuples/remote_account';
import Status from './tuples/status';
import URI from './tuples/uri';

export const temporaryError = Symbol();

export function fetch({ host }: Repository, url: string | Request, init: RequestInit | null, recover: (error: Error & { [temporaryError]: boolean }) => unknown) {
  const size = 1048576;
  const timeout = 16384;
  const headers = { 'User-Agent': `Miniverse (${domainToASCII(host)})` };

  return originalFetch(url, Object.assign({ size, timeout }, init, {
    headers: init ? Object.assign(headers, init.headers) : headers
  })).then(async response => {
    if (!response.ok) {
      await response.buffer();

      if ([429, 500, 502, 503, 504].includes(response.status)) {
        throw recover(Object.assign(new Error('Status code indicates an error.'), { [temporaryError]: true }));
      }

      throw recover(Object.assign(new Error('Status code indicates an error'), { [temporaryError]: false }));
    }

    return response;
  }, error => {
    if (error instanceof FetchError) {
      throw recover(Object.assign(error, { [temporaryError]: true }));
    }

    throw error;
  });
}

function isRecipientAccount(account: LocalAccount | RemoteAccount | null): account is RemoteAccount {
  if (!account) {
    return false;
  }

  if (!(account instanceof RemoteAccount)) {
    throw new Error('Unexpected account type.');
  }

  return true;
}

export async function postStatus(repository: Repository, status: Status, recover: (error: Error) => unknown) {
  const actor = await status.select('actor');
  if (!actor) {
    throw recover(new Error('actor not found.'));
  }

  const followers = await actor.select('followers');

  await Promise.all([
    actor.host || Promise.all(followers.map(
      recipient => recipient.host ? recipient.select('account') : null)).then(
      unfilteredAccounts => {
        const accounts = unfilteredAccounts.filter(isRecipientAccount);
        const inboxURIIds = accounts.map(({ inboxURIId }) => inboxURIId);
        const inboxURIIdSet = new Set(inboxURIIds);

        return Promise.all((function *() {
          for (const inboxURIId of inboxURIIdSet) {
            yield repository.queue.add({
              type: 'postStatus',
              statusId: status.id,
              inboxURIId
            });
          }
        })());
      }),
    repository.insertIntoInboxes(
      followers.concat([actor]).filter(recipient => !recipient.host),
      status)
  ] as unknown[]);
}

export async function postToInbox<T>(repository: Repository, sender: LocalAccount, { uri }: URI, object: { toActivityStreams(recover: (error: T) => unknown): { [key: string]: unknown } }, recover: (error: Error & { [temporaryError]?: boolean } | T) => unknown) {
  const [activityStreams, [keyId, key]] = await Promise.all([
    object.toActivityStreams(recover),
    sender.select('actor').then(owner => {
      if (!owner) {
        throw recover(Object.assign(new Error('sender\'s actor not found'), { [temporaryError]: false }));
      }

      const key = new Key({ owner, repository });
      return Promise.all([key.getUri(recover), key.selectPrivateKeyDer(recover)]);
    })
  ]);

  activityStreams['@context'] = 'https://www.w3.org/ns/activitystreams';

  const response = await fetch(repository, uri, {
    method: 'POST',
    body: JSON.stringify(activityStreams),
    headers: { 'Content-Type': 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"' },
    size: -1,
    onrequest(request) {
      sign(request, {
        authorizationHeaderName: 'Signature',
        key: createPrivateKey({ format: 'der', type: 'pkcs1', key }).export({
          format: 'pem',
          type: 'pkcs1'
        }) as string,
        keyId
      });
    }
  }, recover);

  await response.buffer().catch((error: unknown) => {
    if (error instanceof FetchError) {
      if (error.type != 'max-size') {
        throw recover(Object.assign(error, { [temporaryError]: true }));
      }
    } else {
      throw error;
    }
  });
}
