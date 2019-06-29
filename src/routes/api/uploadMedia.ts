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

import { is } from 'type-is';
import Create from '../../lib/tuples/create';
import Document from '../../lib/tuples/document';
import secure from '../_secure';
import Busboy = require('busboy');

const recovery = {};

export const post = secure(async (request, response) => {
  if (!response.locals.user) {
    response.sendStatus(401);
    return;
  }

  // SocialCG/ActivityPub/MediaUpload - W3C Wiki
  // https://www.w3.org/wiki/SocialCG/ActivityPub/MediaUpload
  // > a client MUST submit a multipart/form-data message to the user's
  // > uploadMedia endpoint on their ActivityStreams profile object.
  const contentType = request.headers['content-type'];
  if (contentType && !is(contentType, 'multipart/form-data')) {
    response.sendStatus(415);
    return;
  }

  const busboy = new Busboy({ headers: request.headers });

  const filePromise = new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    busboy.on('file', (fieldname, file) => {
      /*
        > The submitted form data should contain two parts / fields:
        > file
        >   The media file file being uploaded.
        > object
        >   A shell of an ActivityStreams object, which will be finalized by the
        >   server.
      */
      if (fieldname != 'file') {
        return;
      }

      resolve(file);
    });

    busboy.on('error', reject);
  });

  request.pipe(busboy);

  const file = await filePromise;
  const { repository } = request.app.locals;
  const { signal } = response.locals;

  try {
    const object = await Document.create(
      repository,
      file,
      signal,
      () => recovery);

    const create = new Create({ repository, object });
    response.setHeader('Location', await create.getId(signal, () => recovery));
  } catch (error) {
    if (error != recovery) {
      throw error;
    }

    response.sendStatus(422);
    return;
  }

  /*
    > Assuming that the server accepts the request and that the user was
    > appropriately authorized to upload media, servers MUST respond with a 201
    > Created if the object is immediately available or a 202 Accepted if the
    > server is still processing the submitted media.
  */
  response.sendStatus(201);
});
