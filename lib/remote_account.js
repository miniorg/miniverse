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

export default class {
  constructor(properties) {
    Object.assign(this, properties);

    if (this.person) {
      this.person.account = this;
    }
  }

  async selectPerson(repository) {
    await repository.loadPerson(this.person);
    return this.person;
  }

  static async create(repository, username, host, uri, inbox, publicKey) {
    const account = new this(
      { person: new Person({ username, host }), uri, inbox, publicKey });

    account.person.validate();
    await repository.insertRemoteAccount(account);

    return account;
  }
}
