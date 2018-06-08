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

import RemoteAccount from '../remote_account';

function parse({ id, inbox_uri_id, key_uri_id, public_key_pem }) {
  return new RemoteAccount({
    repository: this,
    id,
    inboxURIId: inbox_uri_id,
    publicKeyURIId: key_uri_id,
    publicKey: { publicKeyPem: public_key_pem }
  });
}

export default {
  async insertRemoteAccount(account) {
    const { rows } = await this.pg.query({
      name: 'insertRemoteAccount',
      text: 'SELECT * FROM insert_remote_account($1, $2, $3, $4, $5, $6) AS (id BIGINT, inbox_uri_id BIGINT, key_uri_id BIGINT)',
      values: [
        account.person.username,
        account.person.host,
        account.uri.uri,
        account.inbox.uri.uri,
        account.publicKey.uri.uri,
        account.publicKey.publicKeyPem
      ]
    });

    account.id = rows[0].id;
    account.person.id = rows[0].id;
    account.uri.id = rows[0].id;
    account.inboxURIId = rows[0].inbox_uri_id;
    account.inbox.uri.id = rows[0].inbox_uri_id;
    account.publicKeyURIId = rows[0].key_uri_id;
    account.publicKey.uri.id = rows[0].key_uri_id;
  },

  async selectRemoteAccountById(id) {
    const { rows } = await this.pg.query({
      name: 'selectRemoteAccountById',
      text: 'SELECT * FROM remote_accounts WHERE id = $1',
      values: [id]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  },

  async selectRemoteAccountByKeyUri(uri) {
    const { rows } = await this.pg.query({
      name: 'selectRemoteAccountByKeyUri',
      text: 'SELECT * FROM remote_accounts WHERE key_uri_id = $1',
      values: [uri.id]
    });

    if (rows[0]) {
      const account = parse.call(this, rows[0]);
      account.publicKey.uri = uri;
      return account;
    }

    return null;
  }
};
