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

import Actor from '../../lib/actor';
import { normalizeHost } from '../../lib/uri';
import secure from '../_secure';

export const get = secure(async ({ query, repository }, response) => {
  const lowerResource = query.resource;
  const [, userpart, host] = /(?:acct:)?(.*)@(.*)/.exec(lowerResource);
  const normalizedHost = normalizeHost(host);

  const actor = await (host == normalizeHost(repository.fingerHost) ?
    repository.selectActorByUsernameAndNormalizedHost(
      decodeURI(userpart), null) :
    Actor.resolveByUsernameAndNormalizedHost(
      repository, decodeURI(userpart), host));

  const account = await actor.select('account');

  response.json(await account.toWebFinger());
});
