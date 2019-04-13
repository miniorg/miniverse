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

import { text } from 'body-parser';
import { parseRequest } from 'http-signature';
import { HttpSignatureError } from 'http-signature/lib/utils';
import { promisify } from 'util';
import secure from '../_secure';

const setBody = promisify(text({
  type: ['application/activity+json', 'application/ld+json']
}));

/*
  ActivityPub
  5.2 Inbox
  https://www.w3.org/TR/activitypub/#inbox
  > The inboxes of actors on federated servers accepts HTTP POST requests, with
  > behaviour described in Delivery.
*/
export const post = secure(async (request, response) => {
  let signature;

  request.headers.authorization = 'Signature ' + request.headers.signature;

  try {
    signature = parseRequest(request);
  } catch (error) {
    if (error instanceof HttpSignatureError) {
      response.sendStatus(401);
      return;
    }

    throw error;
  }

  await setBody(request, response);

  await request.repository.queue.add({
    type: 'processInbox',
    signature,
    body: request.body
  });

  response.sendStatus(202);
});
