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
import { promisify } from 'util';
import ParsedActivityStreams,
       { NoHost } from '../../lib/parsed_activitystreams';
import Actor from '../../lib/actor';
import secure from '../_secure';
import sendActivityStreams from '../_send_activitystreams';

const setBody = promisify(urlencoded({ extended: false }));

export const post = secure(async (request, response) => {
  await setBody(request, response);

  const { body, repository } = request;
  const parsed = new ParsedActivityStreams(repository, body.id, NoHost);
  const actor = await Actor.fromParsedActivityStreams(repository, parsed);

  await sendActivityStreams(response, actor);
});
