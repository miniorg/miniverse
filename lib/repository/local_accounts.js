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

function parse({ id, admin, private_key_pem, salt, server_key, stored_key }) {
  return new LocalAccount({
    repository: this,
    id,
    admin,
    privateKeyPem: private_key_pem,
    salt,
    serverKey: server_key,
    storedKey: stored_key
  });
}

export default {
  getInboxChannel({ id }) {
    return `${this.redis.prefix}inbox:${id}:channel`;
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

    account.id = insert_local_account;
    account.person.id = insert_local_account;
  },

  async insertIntoInboxes(accountOrPersons, item) {
    const message = await item.toActivityStreams();
    message['@context'] = 'https://www.w3.org/ns/activitystreams';

    const string = JSON.stringify(message);

    return this.redis
               .client
               .pipeline(accountOrPersons.map(({ id }) => [
                 'zadd',
                 `${this.redis.prefix}inbox:${id}`,
                 item.id,
                 item.id
               ]).concat(accountOrPersons.map(accountOrPerson => [
                 'publish',
                 this.getInboxChannel(accountOrPerson),
                 string
               ])))
               .exec();
  },

  async selectLocalAccountByDigestOfCookie(digest) {
    const { rows } = await this.pg.query({
      name: 'selectLocalAccountByDigestOfCookie',
      text: 'SELECT local_accounts.* FROM local_accounts JOIN cookies ON local_accounts.id = cookies.person_id WHERE cookies.digest = $1',
      values: [digest]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  },

  async selectLocalAccountById(id) {
    const { rows } = await this.pg.query({
        name: 'selectLocalAccountById',
        text: 'SELECT * FROM local_accounts WHERE id = $1',
        values: [id],
      });

    return rows[0] ? parse.call(this, rows[0]) : null;
  }
};
