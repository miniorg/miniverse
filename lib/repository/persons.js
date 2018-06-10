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

function parse({ id, username, host }) {
  return new Person({ repository: this, id, username, host: host || null });
}

export default {
  async selectPersonById(id) {
    const { rows } = await this.pg.query({
      name: 'selectPersonById',
      text: 'SELECT * FROM persons WHERE id = $1',
      values: [id]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  },

  async selectPersonByUsernameAndNormalizedHost(username, normalizedHost) {
    const { rows } = await this.pg.query({
      name: 'selectPersonByUsernameAndNormalizedHost',
      text: 'SELECT * FROM persons WHERE username = $1 AND lower(host) = $2',
      values: [username, normalizedHost || '']
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  },

  async selectPersonsIncludingOuterRemoteAccountsByFollowee({ id }) {
    const { rows } = await this.pg.query({
      name: 'selectPersonsIncludingOuterRemoteAccountsByFollowee',
      text: 'SELECT persons.*, remote_accounts.inbox_uri_id AS remote_account_inbox_uri_id, remote_accounts.key_uri_id AS remote_account_key_uri_id, remote_accounts.public_key_pem AS remote_account_public_key_pem FROM persons JOIN follows ON persons.id = follows.actor_id LEFT OUTER JOIN remote_accounts ON follows.actor_id = remote_accounts.id WHERE follows.object_id = $1',
      values: [id]
    });

    return rows.map(row => {
      const person = parse.call(this, row);

      if (row.remote_account_key_uri_id) {
        person.account = new RemoteAccount({
          repository: this,
          id: row.id,
          person,
          inboxURIId: row.remote_account_inbox_uri_id,
          publicKeyURIId: row.remote_account_key_uri_id,
          publicKeyPem: row.remote_account_public_key_pem
        });
      }

      return person;
    });
  },

  async selectPersonsIncludingOuterRemoteAccountsOuterUrisMentionedByNoteId(id) {
    const { rows } = await this.pg.query({
      name: 'selectPersonsIncludingOuterRemoteAccountsOuterUrisMentionedByNI',
      text: 'SELECT persons.*, remote_accounts.inbox_uri_id AS remote_account_inbox_uri_id, remote_accounts.key_uri_id AS remote_account_key_uri_id, remote_accounts.public_key_pem AS remote_account_public_key_pem, uris.uri FROM persons JOIN mentions ON persons.id = mentions.href_id LEFT OUTER JOIN remote_accounts ON mentions.href_id = remote_accounts.id LEFT OUTER JOIN uris ON mentions.href_id = uris.id WHERE mentions.note_id = $1',
      values: [id]
    });

    return rows.map(row => {
      const person = parse.call(this, row);

      if (row.remote_account_key_uri_id) {
        person.account = new RemoteAccount({
          repository: this,
          id: row.id,
          person,
          uri: new URI({ repository: this, id: row.id, uri: row.uri }),
          inboxURIId: row.remote_account_inbox_uri_id,
          publicKeyURIId: row.remote_account_key_uri_id,
          publicKeyPem: row.remote_account_public_key_pem
        });
      }

      return person;
    });
  }
};
