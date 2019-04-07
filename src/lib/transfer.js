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

import originalFetch, { FetchError } from 'node-fetch';
import { sign } from 'http-signature';
import { domainToASCII } from 'url';
import { Custom as CustomError, Temporary as TemporaryError } from './errors';
import Key from './tuples/key';

export function fetch({ host }, url, options) {
  const size = 1048576;
  const timeout = 16384;
  const headers = { 'User-Agent': `Miniverse (${domainToASCII(host)})` };

  return originalFetch(url, Object.assign({ size, timeout }, options, {
    headers: options ? Object.assign(headers, options.headers) : headers
  })).then(response => {
    if (!response.ok) {
      return response.buffer().then(() => {
        if ([429, 500, 502, 503, 504].includes(response.status)) {
          throw new TemporaryError(
            'Temporary error status code returned.', 'info');
        }

        throw new CustomError('Error status code returned', 'info');
      });
    }

    return response;
  }, error => {
    if (error instanceof FetchError) {
      throw TemporaryError.wrap([error], 'info');
    }

    throw error;
  });
}

export async function postStatus(repository, status) {
  const actor = await status.select('actor');
  const followers = await actor.select('followers');

  await Promise.all([
    actor.host || Promise.all(followers.map(
      recipient => recipient.host ? recipient.select('account') : null)).then(
        nullableAccounts => {
          const accounts = nullableAccounts.filter(Boolean);
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
  ]);
}

export async function postToInbox(repository, sender, { uri }, object) {
  const [activityStreams, [keyId, privateKeyPem]] = await Promise.all([
    object.toActivityStreams(),
    sender.select('actor').then(owner => {
      const key = new Key({ owner, repository });
      return Promise.all([key.getUri(), key.selectPrivateKeyPem()]);
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
        key: privateKeyPem,
        keyId
      });
    }
  });

  await response.buffer().catch(error => {
    if (!(error instanceof FetchError && error.type == 'max-size')) {
      throw error;
    }
  });
}
