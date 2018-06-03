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

import Person from './person';
import URI from './uri';

export default class {
  constructor(properties) {
    Object.assign(this, properties);

    if (this.person) {
      this.person.account = this;
    }
  }

  async selectPerson() {
    await this.repository.loadPerson(this.person);
    return this.person;
  }

  async selectInboxUri() {
    await this.repository.loadURI(this.inbox.uri);
    return this.inbox.uri;
  }

  async selectPublicKeyUri() {
    await this.repository.loadURI(this.publicKey.uri);
    return this.publicKey.uri;
  }

  static async create(repository, username, host, uri, inbox, publicKey) {
    const account = new this({
      repository,
      person: new Person({ repository, username, host }),
      uri,
      inbox: { uri: new URI({ repository, uri: inbox.uri }) },
      publicKey: {
        uri: new URI({ repository, uri: publicKey.uri }),
        publicKeyPem: publicKey.publicKeyPem
      }
    });

    account.person.validate();
    await repository.insertRemoteAccount(account);

    return account;
  }
}
