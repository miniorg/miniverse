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

import LocalAccount from '../local_account';
import Person from '../person';

function parse(person, { admin, private_key_pem, salt, server_key, stored_key }) {
  return new LocalAccount({
    person,
    admin,
    privateKeyPem: private_key_pem,
    salt,
    serverKey: server_key,
    storedKey: stored_key
  });
}

export default {
  getInboxChannel({ person }) {
    return `${this.redis.prefix}inbox:${person.id}:channel`;
  },

  async insertLocalAccount(account) {
    const { rows: [ { insert_local_account } ] } = await this.pg.query({
      name: 'insertLocalAccount',
      text: 'SELECT insert_local_account($1, $2, $3, $4, $5, $6)',
      values: [
        account.person.username,
        account.admin,
        account.privateKeyPem,
        account.salt,
        account.serverKey,
        account.storedKey
      ]
    });

    account.person.id = insert_local_account;

    this.loadeds.add(account);
    this.loadeds.add(account.person);
  },

  async insertIntoInboxes(accounts, item) {
    const message = await item.toActivityStreams();
    message['@context'] = 'https://www.w3.org/ns/activitystreams';

    const string = JSON.stringify(message);

    return this.redis
               .client
               .pipeline(accounts.map(({ person }) => [
                 'zadd',
                 `${this.redis.prefix}inbox:${person.id}`,
                 item.id,
                 item.id
               ]).concat(accounts.map(account => [
                 'publish',
                 this.getInboxChannel(account),
                 string
               ])))
               .exec();
  },

  async selectLocalAccountByDigestOfCookie(digest) {
    const { rows } = await this.pg.query({
      name: 'selectLocalAccountByDigestOfCookie',
      text: 'SELECT local_accounts.* FROM local_accounts JOIN cookies ON local_accounts.person_id = cookies.person_id WHERE cookies.digest = $1',
      values: [digest]
    });

    if (rows[0]) {
      const account = parse(new Person({ id: rows[0].person_id }), rows[0]);
      this.loadeds.add(account);
      return account;
    }

    return null;
  },

  async selectLocalAccountsByFollowee({ id }) {
    const { rows } = await this.pg.query({
      name: 'selectLocalAccountsByFollowee',
      text: 'SELECT local_accounts.* FROM local_accounts JOIN follows ON local_accounts.person_id = follows.actor_id WHERE follows.object_id = $1',
      values: [id]
    });

    return rows.map(row => {
      const account = parse(new Person({ id: rows[0].person_id }), row);
      this.loadeds.add(account);
      return account;
    });
  },

  async selectLocalAccountByUsername(username) {
    const { rows } = await this.pg.query({
        name: 'selectLocalAccountByUsername',
        text: 'SELECT local_accounts.* FROM local_accounts JOIN persons ON local_accounts.person_id = persons.id WHERE persons.username = $1 AND lower(persons.host) = \'\'',
        values: [username]
      });

    if (rows[0]) {
      const account = parse(
        new Person({ id: rows[0].person_id, username, host: null }),
        rows[0]);

      this.loadeds.add(account);
      this.loadeds.add(account.person);

      return account;
    }

    return null;
  },

  async selectLocalAccountByPerson(person) {
    if (this.loadeds.has(person.account)) {
      return person.account instanceof LocalAccount ? person.account : null;
    }

    const { rows } = await this.pg.query({
        name: 'selectLocalAccountByPerson',
        text: 'SELECT * FROM local_accounts WHERE person_id = $1',
        values: [person.id],
      });

    if (rows[0]) {
      if (person.account) {
        person.account.admin = rows[0].admin;
        person.account.privateKeyPem = rows[0].private_key_pem;
        person.account.salt = rows[0].salt;
        person.account.serverKey = rows[0].server_key;
        person.account.storedKey = rows[0].stored_key;
      } else {
        person.account = parse(person, rows[0]);
      }

      this.loadeds.add(person.account);

      return person.account;
    }

    return null;
  }
};
