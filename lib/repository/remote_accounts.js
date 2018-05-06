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

export default {
  async insertRemoteAccount(account) {
    const { rows: [ { insert_remote_account } ] } = await this.pg.query({
      name: 'insertRemoteAccount',
      text: 'SELECT insert_remote_account($1, $2, $3, $4, $5, $6)',
      values: [
        account.person.username,
        account.person.host,
        account.uri,
        account.inbox.uri,
        account.publicKey.uri,
        account.publicKey.publicKeyPem
      ]
    });

    account.person.id = insert_remote_account;

    this.loadeds.add(account);
    this.loadeds.add(account.person);
  },

  async selectRemoteAccountByUsernameAndNormalizedHost(username, normalizedHost) {
    const { rows } = await this.pg.query({
      name: 'selectRemoteAccountByUsernameAndNormalizedHost',
      text: 'SELECT remote_accounts.*, persons.username AS person_username, persons.host AS person_host FROM remote_accounts JOIN persons ON remote_accounts.person_id = persons.id WHERE persons.username = $1 AND lower(persons.host) = $2',
      values: [username, normalizedHost]
    });

    if (rows[0]) {
      const account = new RemoteAccount({
        person: new Person({
          id: rows[0].person_id,
          username: rows[0].person_username,
          host: rows[0].person_host || null
         }),
        uri: rows[0].uri,
        inbox: { uri: rows[0].inbox_uri },
        publicKey: {
          uri: rows[0].key_uri,
          publicKeyPem: rows[0].public_key_pem
        }
      });

      this.loadeds.add(account);
      this.loadeds.add(account.person);

      return account;
    }

    return null;
  },

  async selectRemoteAccountByKeyUri(uri) {
    const { rows } = await this.pg.query({
      name: 'selectRemoteAccountByKeyUri',
      text: 'SELECT remote_accounts.* FROM remote_accounts WHERE remote_accounts.key_uri = $1',
      values: [uri]
    });

    if (rows[0]) {
      const account = new RemoteAccount({
        person: new Person({ id: rows[0].person_id }),
        uri: rows[0].uri,
        inbox: { uri: rows[0].inbox_uri },
        publicKey: {
          uri: rows[0].key_uri,
          publicKeyPem: rows[0].public_key_pem
        }
      });

      this.loadeds.add(account);

      return account;
    }

    return null;
  },

  async selectRemoteAccountByPerson(person) {
    if (this.loadeds.has(person.account)) {
      return person.account instanceof RemoteAccount ? person.account : null;
    }

    const { rows } = await this.pg.query({
      name: 'selectRemoteAccountByPerson',
      text: 'SELECT * FROM remote_accounts WHERE person_id = $1',
      values: [person.id]
    });

    if (person.account) {
      person.account.uri = rows[0].uri;
      person.account.inbox = { uri: rows[0].inbox_uri };
      person.account.publicKey = {
        uri: rows[0].key_uri,
        publicKeyPem: rows[0].public_key_pem
      };
    } else {
      person.account = new RemoteAccount({
        person,
        uri: rows[0].uri,
        inbox: { uri: rows[0].inbox_uri },
        publicKey: {
          uri: rows[0].key_uri,
          publicKeyPem: rows[0].public_key_pem
        }
      });
    }

    this.loadeds.add(person.account);
    return person.account;
  }
};
