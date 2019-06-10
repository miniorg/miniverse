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
import LocalAccount, { Seed } from '../tuples/local_account';
import Status from '../tuples/status';
import Repository from '.';

function parse(this: Repository, { id, admin, private_key_der, salt, server_key, stored_key }: {
  readonly id: string;
  readonly admin: boolean;
  readonly private_key_der: Buffer;
  readonly salt: Buffer;
  readonly server_key: Buffer;
  readonly stored_key: Buffer;
}) {
  return new LocalAccount({
    repository: this,
    id,
    admin,
    privateKeyDer: private_key_der,
    salt,
    serverKey: server_key,
    storedKey: stored_key
  });
}

export default class {
  getInboxChannel(this: Repository, accountOrActor: LocalAccount | Actor, recover: (error: Error) => unknown) {
    if (accountOrActor.id) {
      return `${this.redis.prefix}inbox:${accountOrActor.id}:channel`;
    }

    throw recover(new Error('Unpersisted Account or Actor.'));
  }

  async insertLocalAccount(this: Repository, {
    actor,
    admin,
    privateKeyDer,
    salt,
    serverKey,
    storedKey
  }: Seed & {
    readonly privateKeyDer: Buffer;
  }, recover: (error: Error) => unknown) {
    let result;

    try {
      result = await this.pg.query({
        name: 'insertLocalAccount',
        text: 'SELECT insert_local_account($1, $2, $3, $4, $5, $6, $7, $8)',
        values: [
          actor.username,
          actor.name,
          actor.summary,
          admin,
          privateKeyDer,
          salt,
          serverKey,
          storedKey
        ]
      });
    } catch (error) {
      if (error.code == '23505') {
        throw recover(new Error('username conflicts.'));
      }

      throw error;
    }

    return new LocalAccount({
      repository: this,
      actor: new Actor({
        repository: this,
        id: result.rows[0].insert_local_account,
        username: actor.username,
        host: null,
        name: actor.name,
        summary: actor.summary
      }),
      admin,
      privateKeyDer,
      salt,
      serverKey,
      storedKey
    });
  }

  async insertIntoInboxes(this: Repository, accountOrActors: (LocalAccount | Actor)[], item: Status, recover: (error: Error) => unknown) {
    const { id } = item;
    if (!id) {
      throw recover(new Error('Status uninitialized.'));
    }

    const extension = await item.select('extension');
    if (!extension) {
      throw recover(new Error('extension not found.'));
    }

    const message = await extension.toActivityStreams(recover) as { [key: string]: unknown };
    message['@context'] = 'https://www.w3.org/ns/activitystreams';

    const string = JSON.stringify(message);

    return this.redis.client.pipeline(accountOrActors.map<string[]>(accountOrActor => [
      'zadd',
      `${this.redis.prefix}inbox:${accountOrActor.id}`,
      id,
      id
    ]).concat(accountOrActors.map(accountOrActor => [
      'zremrangebyrank',
      `${this.redis.prefix}inbox:${accountOrActor.id}`,
      '0',
      '-4096'
    ]), accountOrActors.map(accountOrActor => [
      'publish',
      this.getInboxChannel(accountOrActor),
      string
    ]))).exec();
  }

  async selectLocalAccountByDigestOfCookie(this: Repository, digest: Buffer): Promise<LocalAccount | null> {
    const { rows } = await this.pg.query({
      name: 'selectLocalAccountByDigestOfCookie',
      text: 'SELECT local_accounts.* FROM local_accounts JOIN cookies ON local_accounts.id = cookies.account_id WHERE cookies.digest = $1',
      values: [digest]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  }

  async selectLocalAccountById(this: Repository, id: string): Promise<LocalAccount | null> {
    const { rows } = await this.pg.query({
      name: 'selectLocalAccountById',
      text: 'SELECT * FROM local_accounts WHERE id = $1',
      values: [id],
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  }
}
