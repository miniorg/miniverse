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

import { mediaType } from '@hapi/accept';
import Actor from '../../lib/tuples/actor';
import { normalizeHost } from '../../lib/tuples/uri';
import secure from '../_secure';
import sendActivityStreams from '../_send_activitystreams';

const recovery = {};

export const get = secure(async ({ params, headers }, response, next) => {
  /*
    ActivityPub
    https://www.w3.org/TR/activitypub/
    > Servers MAY use HTTP content negotiation as defined in [RFC7231] to select
    > the type of data to return in response to a request, but MUST present the
    > ActivityStreams object representation in response to
    > application/ld+json; profile="https://www.w3.org/ns/activitystreams",
    > and SHOULD also present the ActivityStreams representation in response to
    > application/activity+json as well.
  */
  /*
    Avoid accepts method of express.Response because parameters such as
    "profile" confuses it.
  */
  const accepted = mediaType(headers.accept, [
    'text/html',
    'application/activity+json',
    'application/ld+json'
  ]);

  if (accepted == '' || accepted.startsWith('text/html')) {
    next();
    return;
  }

  const acct = decodeURIComponent(params.acct);
  const atIndex = acct.lastIndexOf('@');
  let actor;
  let username;
  let normalizedHost;

  if (atIndex < 0) {
    username = acct;
    normalizedHost = null;
  } else {
    username = acct.slice(0, atIndex);
    normalizedHost = normalizeHost(acct.slice(atIndex + 1));
  }

  try {
    actor = await Actor.fromUsernameAndNormalizedHost(
      response.app.locals.repository,
      username,
      normalizedHost,
      response.locals.signal,
      () => recovery);
  } catch (error) {
    if (error == recovery) {
      response.sendStatus(422);
      return;
    }

    throw error;
  }

  if (actor) {
    await sendActivityStreams(response, actor);
  } else {
    response.sendStatus(404);
  }
});
