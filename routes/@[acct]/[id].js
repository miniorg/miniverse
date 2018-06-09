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
import sendActivityStreams from './_send_activitystreams';

export function get(request, response, next) {
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

  repository.selectNoteById(params.id).then(async note => {
    if (!note) {
      response.sendStatus(404);
      return;
    }

    const attributedTo = await note.select('attributedTo');

    if (!attributedTo ||
        attributedTo.username != username ||
        (attributedTo.host != normalizedHost &&
         normalizeHost(attributedTo.host) != normalizedHost)) {
      response.sendStatus(404);
      return;
    }

    await sendActivityStreams(response, note);
  }).catch(next);
}
