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

import Person from '../../lib/person';
import URI from '../../lib/uri';

export function get(request, response, next) {
  const accepted = request.accepts([
    'html',
    'application/activity+json',
    'application/ld+json'
  ]);

  if (!['application/activity+json', 'application/ld+json'].includes(accepted)) {
    next();
    return;
  }

  const { params, repository } = request;
  const acct = decodeURIComponent(params.acct);
  const atIndex = acct.lastIndexOf('@');
  let username;
  let normalizedHost;

  if (atIndex < 0) {
    username = acct;
    normalizedHost = null;
  } else {
    username = acct.slice(0, atIndex);
    normalizedHost = URI.normalizeHost(acct.slice(atIndex + 1));
  }

  Person.resolveByUsernameAndNormalizedHost(repository, username, normalizedHost).then(async person => {
    const message = await person.toActivityStreams();

    message['@context'] = [
      'https://miniverse.social/ns',
      'https://w3id.org/security/v1',
      'https://www.w3.org/ns/activitystreams'
    ];

    return message;
  }).then(response.json.bind(response), next);
}
