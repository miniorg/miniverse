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

import Actor from '../../lib/tuples/actor';
import { normalizeHost } from '../../lib/tuples/uri';
import secure from '../_secure';

const recovery = {};

export const get = secure(async ({ query }, response) => {
  const lowerResource = query.resource;
  const parsed = /(?:acct:)?(.*)@(.*)/.exec(lowerResource);

  if (!parsed) {
    response.sendStatus(404);
    return;
  }

  const [, userpart, host] = parsed;
  const { repository } = response.app.locals;
  const { signal } = response.locals;
  let actor;

  try {
    if (host == normalizeHost(repository.fingerHost)) {
      actor = await repository.selectActorByUsernameAndNormalizedHost(
        decodeURI(userpart), null, signal, () => recovery);
    } else {
      actor = await Actor.fromUsernameAndNormalizedHost(
        repository,
        decodeURI(userpart),
        host,
        signal,
        () => recovery);
    }

    if (!actor) {
      response.sendStatus(404);
      return;
    }

    const account = await actor.select('account', signal, () => recovery);
    if (!account) {
      response.sendStatus(404);
      return;
    }

    response.json(await account.toWebFinger(signal, _error => recovery));
  } catch (error) {
    if (error == recovery) {
      response.sendStatus(500);
      return;signal
    }

    throw error;
  }
});
