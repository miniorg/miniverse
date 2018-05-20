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
import Key from '../key';
import URI from '../uri';
import FromParsedActivityStreams from './from_parsed_activitystreams';
import Resolver from './resolver';

export default Object.assign(class {
  constructor(properties) {
    Object.assign(this, properties);

    if (this.account) {
      this.account.person = this;
    }
  }

  validate() {
    if (!/^[\w-.~!$&'()*+,;=].*$/.test(this.username)) {
      throw new Error;
    }
  }

  async getUri() {
    if (this.host) {
      const { uri } = await this.repository.selectRemoteAccountByPerson(this);
      return uri;
    }

    const host = domainToASCII(this.repository.host);
    const username = URI.encodeSegment(this.username);

    return `https://${host}/@${username}`;
  }

  async toActivityStreams() {
    if (this.host) {
      const host = domainToASCII(this.repository.host);
      const acct = URI.encodeSegment(`${this.username}@${this.host}`);
      const id = `https://${host}/@${acct}`;

      return {
        id,
        type: 'Person',
        preferredUsername: this.username,
        inbox: id + '/inbox',
        outbox: id + '/outbox'
      };
    }

    const key = new Key({ owner: this, repository: this.repository });
    const [id, publicKey, { salt }] = await Promise.all([
      this.getUri(),
      key.toActivityStreams(),
      this.repository.selectLocalAccountByPerson(this)
    ]);

    return {
      id,
      type: 'Person',
      preferredUsername: this.username,
      inbox: id + '/inbox',
      outbox: id + '/outbox',
      publicKey,
      'miniverse:salt': salt.toString('base64')
    };
  }
}, FromParsedActivityStreams, Resolver);
