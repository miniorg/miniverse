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
import Hashtag from '../hashtag';

export default class extends Base {
  async selectHashtagsByNoteId(noteId) {
    const { rows } = await this.pg.query({
      name: 'selectHashtagsByNoteId',
      text: 'SELECT * FROM hashtags JOIN hashtags_notes ON hashtags.id = hashtags_notes.hashtag_id WHERE hashtags_notes.note_id = $1',
      values: [noteId]
    });

    return rows.map(properties => new Hashtag(properties));
  }
}
