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


import { FetchError } from 'node-fetch';
import { sign } from 'http-signature';
import Accept from '../../../../lib/accept';
import fetch from '../../../../lib/fetch';
import Key from '../../../../lib/key';

export default async (repository, { data: { objectId } }) => {
  const accept = new Accept({ objectId, repository });

  const [
    activityStreams,
    [[keyId, privateKeyPem], inboxUri]
  ] = await Promise.all([
    accept.toActivityStreams(),
    accept.select('object').then(follow => Promise.all([
      follow.select('object').then(actor => {
        const key = new Key({ owner: actor, repository });
        return Promise.all([key.getUri(), key.selectPrivateKeyPem()]);
      }),
      follow.select('actor')
            .then(person => person.select('account'))
            .then(account => account.select('inboxURI'))
    ]))
  ]);

  activityStreams['@context'] = 'https://www.w3.org/ns/activitystreams';

  const response = await fetch(repository, inboxUri.uri, {
    method: 'POST',
    body: JSON.stringify(activityStreams),
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
};
