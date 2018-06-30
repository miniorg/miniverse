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
import Actor from './actor';
import URI, { encodeAcctUserpart } from './uri';

export default class RemoteAccount extends Relation {
  async toWebFinger() {
    const actor = await this.select('actor');

    return {
      subject: `acct:${encodeAcctUserpart(actor.username)}@${actor.host}`,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: await actor.getUri(),
        }
      ]
    };
  }

  static async create(repository, username, host, name, summary, uri, inbox, publicKey) {
    const account = new this({
      repository,
      actor: new Actor({ repository, username, host, name, summary }),
      uri: new URI({ repository, uri }),
      inboxURI: new URI({ repository, uri: inbox.uri }),
      publicKeyURI: new URI({ repository, uri: publicKey.uri }),
      publicKeyPem: publicKey.publicKeyPem
    });

    account.actor.validate();
    await repository.insertRemoteAccount(account);

    return account;
  }
}

RemoteAccount.references = {
  actor: {
    query: withRepository('selectActorById'),
    id: 'id',
    inverseOf: 'account'
  },
  uri: {
    query: withRepository('selectURIById'),
    id: 'id'
  },
  inboxURI: {
    query: withRepository('selectURIById'),
    id: 'inboxURIId'
  },
  publicKeyURI: {
    query: withRepository('selectURIById'),
    id: 'publicKeyURIId'
  }
};
