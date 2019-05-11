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

import Mention from '../tuples/mention';
import Repository from '.';

export default class {
  async selectMentionsIncludingActorsByNoteId(this: Repository, id: string): Promise<Mention[]> {
    const hrefs = await this.selectActorsMentionedByNoteId(id);
    return hrefs.map(href => new Mention({ repository: this, href }));
  }
}
