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

import Actor from '../tuples/actor';
import RemoteAccount, { Seed } from '../tuples/remote_account';
import URI from '../tuples/uri';
import Repository, { conflict } from '.';

function parse(this: Repository, { id, inbox_uri_id, key_uri_id, public_key_der }: {
  readonly id: string;
  readonly inbox_uri_id: string;
  readonly key_uri_id: string;
  readonly public_key_der: Buffer;
}) {
  return {
    repository: this,
    id,
    inboxURIId: inbox_uri_id,
    publicKeyURIId: key_uri_id,
    publicKeyDer: public_key_der
  };
}

export default class {
  async insertRemoteAccount(this: Repository, { actor, uri, inbox, publicKey }: Seed, recover: (error: Error & { [conflict]: boolean }) => unknown) {
    const { rows } = await this.pg.query({
      name: 'insertRemoteAccount',
      text: 'SELECT * FROM insert_remote_account($1, $2, $3, $4, $5, $6, $7, $8) AS (id BIGINT, inbox_uri_id BIGINT, key_uri_id BIGINT)',
      values: [
        actor.username,
        actor.host,
        actor.name,
        actor.summary,
        uri,
        inbox.uri,
        publicKey.uri,
        publicKey.publicKeyDer
      ]
    }).catch(error => {
      if (error.code == '23502') {
        throw recover(Object.assign(new Error('URI conflicts'), { [conflict]: true }));
      }

      throw error;
    });

    return new RemoteAccount({
      repository: this,
      actor: new Actor({
        repository: this,
        id: rows[0].id,
        username: actor.username,
        host: actor.host,
        name: actor.name,
        summary: actor.summary
      }),
      uri: new URI({
        repository: this,
        id: rows[0].id,
        uri,
        allocated: true
      }),
      inboxURI: new URI({
        repository: this,
        id: rows[0].inbox_uri_id,
        uri: inbox.uri,
        allocated: true
      }),
      publicKeyURI: new URI({
        repository: this,
        id: rows[0].key_uri_id,
        uri: publicKey.uri,
        allocated: true
      }),
      publicKeyDer: publicKey.publicKeyDer
    });
  }

  async selectRemoteAccountById(this: Repository, id: string): Promise<RemoteAccount | null> {
    const { rows } = await this.pg.query({
      name: 'selectRemoteAccountById',
      text: 'SELECT * FROM remote_accounts WHERE id = $1',
      values: [id]
    });

    return rows[0] ? new RemoteAccount(parse.call(this, rows[0])) : null;
  }

  async selectRemoteAccountByKeyUri(this: Repository, uri: URI): Promise<RemoteAccount | null> {
    const { rows } = await this.pg.query({
      name: 'selectRemoteAccountByKeyUri',
      text: 'SELECT * FROM remote_accounts WHERE key_uri_id = $1',
      values: [uri.id]
    });

    if (rows[0]) {
      return new RemoteAccount(Object.assign(parse.call(this, rows[0]), {
        publicKeyURI: uri
      }));
    }

    return null;
  }
}
