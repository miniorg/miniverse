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

import URI from '../../lib/uri';

export function get({ query, repository }, response, next) {
  const lowerResource = query.resource;
  const [, userpart, host] = /(?:acct:)?(.*)@(.*)/.exec(lowerResource);

  if (URI.normalizeHost(host) != URI.normalizeHost(repository.fingerHost)) {
    response.sendStatus(404);
    return;
  }

  const username = decodeURI(userpart);

  repository.selectLocalAccountByUsername(username).then(async account => {
    response.json(await account.toWebFinger(repository));
  }).catch(next);
}
