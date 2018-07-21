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

import { Custom as CustomError } from '../errors';
import LocalAccount from '../tuples/local_account';
import Base from './base';

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

export default class extends Base {
  getInboxChannel(accountOrActor) {
    if (accountOrActor.id) {
      return `${this.redis.prefix}inbox:${accountOrActor.id}:channel`;
    }

    throw new CustomError('Account or actor is not persisted.', 'error');
  }

  async insertLocalAccount(account) {
    const { rows: [ { insert_local_account } ] } = await this.pg.query({
      name: 'insertLocalAccount',
      text: 'SELECT insert_local_account($1, $2, $3, $4, $5, $6, $7, $8)',
      values: [
        account.actor.username,
        account.actor.name,
        account.actor.summary,
        account.admin,
        account.privateKeyPem,
        account.salt,
        account.serverKey,
        account.storedKey
      ]
    });

    account.id = insert_local_account;
    account.actor.id = insert_local_account;
  }

  async insertIntoInboxes(accountOrActors, item) {
    const extension = await item.select('extension');
    const message = await extension.toActivityStreams();
    message['@context'] = 'https://www.w3.org/ns/activitystreams';

    const string = JSON.stringify(message);

    return this.redis
               .client
               .pipeline(accountOrActors.map(({ id }) => [
                 'zadd',
                 `${this.redis.prefix}inbox:${id}`,
                 item.id,
                 item.id
               ]).concat(accountOrActors.map(accountOrActor => [
                 'publish',
                 this.getInboxChannel(accountOrActor),
                 string
               ])))
               .exec();
  }

  async selectLocalAccountByDigestOfCookie(digest) {
    const { rows } = await this.pg.query({
      name: 'selectLocalAccountByDigestOfCookie',
      text: 'SELECT local_accounts.* FROM local_accounts JOIN cookies ON local_accounts.id = cookies.account_id WHERE cookies.digest = $1',
      values: [digest]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  }

  async selectLocalAccountById(id) {
    const { rows } = await this.pg.query({
        name: 'selectLocalAccountById',
        text: 'SELECT * FROM local_accounts WHERE id = $1',
        values: [id],
      });

    return rows[0] ? parse.call(this, rows[0]) : null;
  }
}
