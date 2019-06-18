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

import { Request, Response, urlencoded } from 'express';
import { promisify } from 'util';
import ParsedActivityStreams, {
  NoHost
} from '../../lib/parsed_activitystreams';
import Actor from '../../lib/tuples/actor';
import secure from '../_secure';
import sendActivityStreams from '../_send_activitystreams';

const recovery = {};
const setBody = promisify(urlencoded({ extended: false })) as
  unknown as
  (request: Request, response: Response) => Promise<unknown>;

export const post = secure(async (request, response) => {
  await setBody(request, response);

  const { body } = request;
  const { repository } = response.app.locals;
  const parsed = new ParsedActivityStreams(repository, body.id, NoHost);
  let actor;

  try {
    actor = await Actor.fromParsedActivityStreams(repository, parsed, response.locals.signal, () => recovery);
  } catch (error) {
    if (error == recovery) {
      response.sendStatus(500);
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
