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
import Entity from './entity';
import { encodeSegment } from './uri';

export default class extends Entity {
  async validate() {
    const { username } = await this.get();

    if (!/^[\w-.~!$&'()*+,;=].*$/.test(username)) {
      throw new Error;
    }
  }

  async getUri() {
    const { username, host } = await this.get();

    if (host) {
      const complete = await this.selectComplete();
      return complete.getUri();
    }

    const repositoryHost = domainToASCII(this.repository.host);
    const encodedUsername = encodeSegment(username);

    return `https://${repositoryHost}/@${encodedUsername}`;
  }

  async toActivityStreams() {
    const { username, host } = await this.get();

    if (host) {
      const repositoryHost = domainToASCII(this.repository.host);
      const acct = encodeSegment(`${username}@${host}`);
      const id = `https://${repositoryHost}/@${acct}`;

      return {
        id,
        type: 'Person',
        preferredUsername: username,
        inbox: id + '/inbox',
        outbox: id + '/outbox'
      };
    }

    const complete = await this.selectComplete();
    return complete.toActivityStreams();
  }
}
