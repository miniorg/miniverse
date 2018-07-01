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

import { domainToASCII } from 'url';
import Relation, { withRepository } from './relation';
import { encodeSegment } from './uri';

export default class Status extends Relation {
  async getUri() {
    const { username, host } = await this.select('actor');

    if (host) {
      const { uri } = await this.select('uri');
      return uri;
    }

    const repositoryHost = domainToASCII(this.repository.host);
    const encodedUsername = encodeSegment(username);

    return `https://${repositoryHost}/@${encodedUsername}/${this.id}`;
  }
}

Status.references = {
  extension: { id: 'id', inverseOf: 'status' },
  actor: { id: 'actorId', query: withRepository('selectActorById') },
  uri: { id: 'id', query: withRepository('selectURIById') }
};
