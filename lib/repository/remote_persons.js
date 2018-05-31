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
import URI from '../uri';

function parse({ username, host, uri, inbox_uri_id, key_uri_id, public_key_pem }, inbox, key) {
  return {
    username,
    host,
    uri,
    inbox: { uri: new URI(this, inbox_uri_id, inbox) },
    publicKey: {
      uri: new URI(this, key_uri_id, key),
      publicKeyPem: public_key_pem
    }
  };
}

export default {
  async insertRemotePerson(person) {
    const { username, host, uri, inbox, publicKey } = await person.get();
    const [inboxUri, publicKeyUri] =
      await Promise.all([inbox.uri.get(), publicKey.uri.get()]);

    const { rows } = await this.pg.query({
      name: 'insertRemotePerson',
      text: 'SELECT * FROM insert_remote_person($1, $2, $3, $4, $5, $6) AS (id BIGINT, inbox_uri_id BIGINT, key_uri_id BIGINT)',
      values: [
        username,
        host,
        uri,
        inboxUri.uri,
        publicKeyUri.uri,
        publicKey.publicKeyPem
      ]
    });

    person.id = rows[0].id;
    inbox.uri.id = rows[0].inbox_uri_id;
    publicKey.uri.id = rows[0].key_uri_id;
  },

  async loadRemotePerson({ id }) {
    const { rows } = await this.pg.query({
      name: 'loadRemotePerson',
      text: 'SELECT * FROM remote_persons WHERE id = $1',
      values: [id]
    });

    return parse.call(this, rows[0]);
  },

  async selectRemotePersonByUsernameAndNormalizedHost(username, normalizedHost) {
    const { rows } = await this.pg.query({
      name: 'selectRemotePersonByUsernameAndNormalizedHost',
      text: 'SELECT * FROM remote_persons WHERE username = $1 AND lower(host) = $2',
      values: [username, normalizedHost]
    });

    return rows[0] ?
      new RemotePerson(this, rows[0].id, parse.call(this, rows[0])) : null;
  },

  async selectRemotePersonByKeyUri(uri) {
    const { rows } = await this.pg.query({
      name: 'selectRemotePersonByKeyUri',
      text: 'SELECT remote_persons.* FROM remote_persons JOIN uris ON remote_persons.key_uri_id = uris.id WHERE uris.uri = $1',
      values: [uri]
    });

    return rows[0] ?
      new RemotePerson(
        this,
        rows[0].id,
        parse.call(this, rows[0], null, { extension: null, uri })) :
      null;
  }
};
