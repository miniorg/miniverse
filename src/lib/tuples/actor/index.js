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

import { domainToASCII, domainToUnicode } from 'url';
import { Custom as CustomError } from '../../errors';
import Key from '../key';
import Relation, { withRepository } from '../relation';
import { encodeSegment } from '../uri';
import FromParsedActivityStreams from './from_parsed_activitystreams';
import Resolver from './resolver';

export default Object.assign(class extends Relation {
  validate() {
    if (!/^[\w-.~!$&'()*+,;=].*$/.test(this.username)) {
      throw new CustomError('username validation failed.', 'info');
    }
  }

  async getUri() {
    if (this.host) {
      const account = await this.select('account');
      const { uri } = await account.select('uri');
      return uri;
    }

    const host = domainToASCII(this.repository.host);
    const username = encodeSegment(this.username);

    return `https://${host}/@${username}`;
  }

  async toActivityStreams() {
    const asciiHost = domainToASCII(this.repository.host);

    if (this.host) {
      const acct = `${this.username}@${domainToUnicode(this.host)}`;
      const proxyBase = `https://${asciiHost}/@${encodeSegment(acct)}`;

      return {
        id: await this.getUri(),
        preferredUsername: this.username,
        name: this.name,
        summary: this.summary,
        inbox: proxyBase + '/inbox',
        outbox: proxyBase + '/outbox'
      };
    }

    // @ts-ignore
    const key = new Key({ owner: this, repository: this.repository });

    const [id, publicKey, { salt }] = await Promise.all([
      this.getUri(),
      key.toActivityStreams(),
      this.select('account')
    ]);

    return {
      id,
      type: 'Person',
      preferredUsername: this.username,
      name: this.name,
      summary: this.summary,
      inbox: id + '/inbox',
      outbox: id + '/outbox',
      endpoints: { proxyUrl: `https://${asciiHost}/api/proxy` },
      publicKey,
      'miniverse:salt': salt.toString('base64')
    };
  }
}, {
  references: {
    account: {
      query({ repository, id, host }) {
        return host ?
          repository.selectRemoteAccountById(id) :
          repository.selectLocalAccountById(id);
      },
      id: 'id',
      inverseOf: 'actor'
    },
    followers: { query: withRepository('selectActorsByFolloweeId'), id: 'id' },
    statuses: {
      query: withRepository('selectRecentStatusesIncludingExtensionsByActorId'),
      id: 'id',
      inverseOf: 'actor'
    }
  }
}, FromParsedActivityStreams, Resolver);
