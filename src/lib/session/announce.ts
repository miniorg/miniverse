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

import { postOutbox } from './fetch';
import Session from './types';

export async function announce(session: Session, givenFetch: typeof fetch, object: string) {
  await postOutbox(session, givenFetch, {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Announce',
    published: new Date,
    to: 'https://www.w3.org/ns/activitystreams#Public',
    object
  });
}
