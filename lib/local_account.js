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
import Key from './key';
import Person from './person';
import URI from './uri';

export default class {
  constructor(properties) {
    Object.assign(this, properties);

    if (this.person) {
      this.person.account = this;
    }
  }

  async toWebFinger(repository) {
    const person = await this.selectPerson(repository);
    const encodedUserpart = URI.encodeAcctUserpart(person.username);
    const encodedHost = domainToASCII(repository.fingerHost);

    return {
      subject: `acct:${encodedUserpart}@${encodedHost}`,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: await person.getUri(repository),
        }
      ]
    };
  }

  async selectPerson(repository) {
    await repository.loadPerson(this.person);
    return this.person;
  }

  static async create(repository, username, admin, salt, serverKey, storedKey) {
    const account = new this({
      person: new Person({ username, host: null }),
      admin,
      privateKeyPem: Key.generate(),
      salt,
      serverKey,
      storedKey
    });

    account.person.validate();
    await repository.insertLocalAccount(account);

    return account;
  }
}
