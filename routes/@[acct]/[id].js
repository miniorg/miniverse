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

import { normalizeHost } from '../../lib/uri';
import secure from '../_secure';
import sendActivityStreams from '../_send_activitystreams';

export const get = secure(async (request, response) => {
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
    normalizedHost = normalizeHost(acct.slice(atIndex + 1));
  }

  const status = await repository.selectStatusIncludingExtensionById(params.id);
  if (!status) {
    response.sendStatus(404);
    return;
  }

  const [extension, person] =
    await Promise.all([status.select('extension'), status.select('person')]);
  if (!extension || !person ||
      person.username != username ||
      (person.host != normalizedHost &&
       normalizeHost(person.host) != normalizedHost)) {
    response.sendStatus(404);
    return;
  }

  await sendActivityStreams(response, extension);
});
