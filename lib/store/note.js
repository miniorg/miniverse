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

import Base from './base';
import { postOutbox } from './fetch';

export default class extends Base {
  async createNote(fetch, content) {
    await postOutbox.call(this, fetch, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Note',
      published: new Date,
      to: 'https://www.w3.org/ns/activitystreams#Public',
      content,
      attachment: [],
      tag: []
    });
  }
}
