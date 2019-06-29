/*
  Copyright (C) 2019  Miniverse authors

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

import Create from '../lib/tuples/create';
import secure from './_secure';
import sendActivityStreams from './_send_activitystreams';

const recovery = {};

export const get = secure(async ({ params }, response) => {
  const { repository } = response.app.locals;
  let object;

  try {
    object = await repository.selectDocumentByUUID(
      params.uuid, response.locals.signal, () => recovery);
  } catch (error) {
    if (error != recovery) {
      throw error;
    }

    response.sendStatus(500);
    return;
  }

  if (!object) {
    response.sendStatus(404);
    return;
  }

  await sendActivityStreams(response, new Create({ repository, object }));
});
