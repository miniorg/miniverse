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

import Relation, { withRepository } from './relation';

export default class Mention extends Relation {
  async toActivityStreams() {
    const href = await this.select('href');
    return { type: 'Mention', href: await href.getUri() };
  }
}

Mention.references = {
  href: { query: withRepository('selectPersonById'), id: 'hrefId' }
};
