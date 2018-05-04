/*
  Copyright (C) 2018  Akihiko Odaki <nekomanma@pixiv.co.jp>

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

const middleware = text({
  type: ['application/activity+json', 'application/ld+json']
});

export function post(request, response, next) {
  request.headers.authorization = 'Signature ' + request.headers.signature;
  const signature = parseRequest(request);

  middleware(request, response,
    () => request.repository
                 .queue
                 .add({ signature, body: request.body })
                 .then(() => response.sendStatus(202), next));
}
