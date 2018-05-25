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

import RemotePerson from '../remote_person';

function parse({ username, host, uri, inbox_uri, key_uri, public_key_pem }) {
  return {
    username,
    host,
    uri,
    inbox: { uri: inbox_uri },
    publicKey: { uri: key_uri, publicKeyPem: public_key_pem }
  };
}

export default {
  async insertRemotePerson(person) {
    const { username, host, uri, inbox, publicKey } = await person.get();
    const { rows } = await this.pg.query({
      name: 'insertRemotePerson',
      text: 'INSERT INTO remote_persons (username, host, uri, inbox_uri, key_uri, public_key_pem) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      values: [
        username,
        host,
        uri,
        inbox.uri,
        publicKey.uri,
        publicKey.publicKeyPem
      ]
    });

    person.id = rows[0].id;
  },

  async loadRemotePerson({ id }) {
    const { rows } = await this.pg.query({
      name: 'loadRemotePerson',
      text: 'SELECT * FROM remote_persons WHERE id = $1',
      values: [id]
    });

    return parse(rows[0]);
  },

  async selectRemotePersonByUsernameAndNormalizedHost(username, normalizedHost) {
    const { rows } = await this.pg.query({
      name: 'selectRemotePersonByUsernameAndNormalizedHost',
      text: 'SELECT * FROM remote_persons WHERE username = $1 AND lower(host) = $2',
      values: [username, normalizedHost]
    });

    return rows[0] ? new RemotePerson(this, rows[0].id, parse(rows[0])) : null;
  },

  async selectRemotePersonByKeyUri(uri) {
    const { rows } = await this.pg.query({
      name: 'selectRemotePersonByKeyUri',
      text: 'SELECT * FROM remote_persons WHERE key_uri = $1',
      values: [uri]
    });

    return rows[0] ? new RemotePerson(this, rows[0].id, parse(rows[0])) : null;
  }
};
