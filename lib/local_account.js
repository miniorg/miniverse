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
import { generate } from './key';
import Person from './person';
import { encodeAcctUserpart } from './uri';

export default class LocalAccount extends Relation {
  async toWebFinger() {
    const person = await this.select('person');
    const encodedUserpart = encodeAcctUserpart(person.username);
    const encodedHost = domainToASCII(this.repository.fingerHost);

    return {
      subject: `acct:${encodedUserpart}@${encodedHost}`,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: await person.getUri(),
        }
      ]
    };
  }

  static async create(repository, username, name, summary, admin, salt, serverKey, storedKey) {
    const account = new this({
      repository,
      person: new Person({ repository, username, host: null, name, summary }),
      admin,
      privateKeyPem: generate(),
      salt,
      serverKey,
      storedKey
    });

    account.person.validate();
    await repository.insertLocalAccount(account);

    return account;
  }
}

LocalAccount.references = {
  inbox: {
    query: withRepository('selectRecentStatusesIncludingExtensionsAndPersonsFromInbox'),
    id: 'id'
  },
  person: {
    query: withRepository('selectPersonById'),
    id: 'id',
    inverseOf: 'account'
  }
};
