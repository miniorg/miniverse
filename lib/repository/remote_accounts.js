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

import Person from '../person';
import RemoteAccount from '../remote_account';
import URI from '../uri';

function selectRemoteAccountById(id) {
  return this.pg.query({
    name: 'remote_accounts.selectRemoteAccountById',
    text: 'SELECT * FROM remote_accounts WHERE id = $1',
    values: [id]
  });
}

function parse(person, { inbox_uri_id, key_uri_id, public_key_pem }) {
  return new RemoteAccount({
    repository: person.repository,
    person,
    uri: new URI({ repository: person.repository, id: person.id }),
    inbox: {
      uri: new URI({ repository: person.repository, id: inbox_uri_id })
    },
    publicKey: {
      uri: new URI({ repository: person.repository, id: key_uri_id }),
      publicKeyPem: public_key_pem
    }
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

    account.person.id = rows[0].id;
    account.uri.id = rows[0].id;
    account.inbox.uri.id = rows[0].inbox_uri_id;
    account.publicKey.uri.id = rows[0].key_uri_id;

    this.loadeds.add(account);
    this.loadeds.add(account.person);
  },

  async selectRemoteAccountByUsernameAndNormalizedHost(username, normalizedHost) {
    const { rows } = await this.pg.query({
      name: 'selectRemoteAccountByUsernameAndNormalizedHost',
      text: 'SELECT remote_accounts.*, persons.username AS person_username, persons.host AS person_host FROM remote_accounts JOIN persons ON remote_accounts.id = persons.id WHERE persons.username = $1 AND lower(persons.host) = $2',
      values: [username, normalizedHost]
    });

    if (rows[0]) {
      const account = parse(new Person({
        repository: this,
        id: rows[0].id,
        username: rows[0].person_username,
        host: rows[0].person_host || null
      }), rows[0]);

      this.loadeds.add(account);
      this.loadeds.add(account.person);

      return account;
    }

    return null;
  },

  async selectRemoteAccountByKeyUri(uri) {
    const { rows } = await this.pg.query({
      name: 'selectRemoteAccountByKeyUri',
      text: 'SELECT * FROM remote_accounts WHERE key_uri_id = $1',
      values: [uri.id]
    });

    if (rows[0]) {
      const account = parse(
        new Person({ repository: this, id: rows[0].id }), rows[0]);

      account.publicKey.uri = uri;

      this.loadeds.add(account);

      return account;
    }

    return null;
  },

  async selectRemoteAccountByPerson(person) {
    if (this.loadeds.has(person.account)) {
      return person.account instanceof RemoteAccount ? person.account : null;
    }

    const { rows } = await selectRemoteAccountById.call(this, person.id);

    if (rows[0]) {
      if (person.account) {
        person.account.uri = new URI({ repository: this, id: person.id });
        person.account.inbox = {
          uri: new URI({ repository: this, id: rows[0].inbox_uri_id })
        };
        person.account.publicKey = {
          uri: new URI({ repository: this, id: rows[0].key_uri_id }),
          publicKeyPem: rows[0].public_key_pem
        };
      } else {
        person.account = parse(person, rows[0]);
      }

      this.loadeds.add(person.account);
      return person.account;
    }

    return null;
  },

  async selectRemoteAccountByUri(uri) {
    const { rows } = await selectRemoteAccountById.call(this, uri.id);

    if (rows[0]) {
      const account = parse(
        new Person({ repository: this, id: rows[0].id }), rows[0]);
      account.uri = uri;

      this.loadeds.add(account);

      return account;
    }

    return null;
  }
};
