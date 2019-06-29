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

import { postOutbox, uploadMedia } from './fetch';
import Session from './types';

export async function create(session: Session, givenFetch: typeof fetch, content: string, document?: Blob) {
  const attachment = [];

  if (document) {
    const data = new FormData;
    data.set('file', document);
    const { headers } = await uploadMedia(session, givenFetch, data);
    const location = headers.get('Location');

    if (location) {
      attachment.push((await (await fetch(location)).json()).object);
    }
  }

  await postOutbox(session, givenFetch, {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Note',
    published: new Date,
    to: 'https://www.w3.org/ns/activitystreams#Public',
    content,
    attachment,
    tag: []
  });
}
