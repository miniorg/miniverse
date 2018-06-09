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

import { urlencoded } from 'express';
import ParsedActivityStreams,
       { NoHost } from '../../lib/parsed_activitystreams';
import Person from '../../lib/person';
import sendActivityStreams from '../_send_activitystreams';

const middleware = urlencoded({ extended: false });

export function post(request, response, next) {
  middleware(request, response, error => {
    if (error) {
      next(error);
      return;
    }

    const { body, repository } = request;
    const parsed = new ParsedActivityStreams(repository, body.id, NoHost);

    Person.fromParsedActivityStreams(repository, parsed)
          .then(person => sendActivityStreams(response, person))
          .catch(next);
  });
}
