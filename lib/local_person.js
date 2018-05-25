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
import BasePerson from './base_person';
import Key, { generate } from './key';
import { encodeAcctUserpart } from './uri';

export default class LocalPerson extends BasePerson {
  async toActivityStreams() {
    const key = new Key({ owner: this, repository: this.repository });
    const [id, publicKey, { salt, username }] = await Promise.all([
      this.getUri(),
      key.toActivityStreams(),
      this.get()
    ]);

    return {
      id,
      type: 'Person',
      preferredUsername: username,
      inbox: id + '/inbox',
      outbox: id + '/outbox',
      publicKey,
      'miniverse:salt': salt.toString('base64')
    };
  }

  async toWebFinger() {
    const { username } = await this.get();
    const encodedUserpart = encodeAcctUserpart(username);
    const encodedHost = domainToASCII(this.repository.fingerHost);

    return {
      subject: `acct:${encodedUserpart}@${encodedHost}`,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: await this.getUri(),
        }
      ]
    };
  }

  static async create(repository, username, admin, salt, serverKey, storedKey) {
    const person = new this(repository, null, {
      username,
      host: null,
      admin,
      privateKeyPem: generate(),
      salt,
      serverKey,
      storedKey
    });

    await person.validate();
    await repository.insertLocalPerson(person);

    return person;
  }
}

LocalPerson.query = 'loadLocalPerson';
