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

import { generateKeyPair } from 'crypto';
import { domainToASCII } from 'url';
import { promisify } from 'util';
import { Account as WebFinger } from '../generated_webfinger';
import Actor from './actor';
import Relation, { Reference } from './relation';
import { encodeAcctUserpart } from './uri';
import Status from './status';
import Repository from '../repository';
import sanitizeHtml = require('sanitize-html');

interface Properties {
  id?: string;
  admin: boolean;
  privateKeyDer: Buffer;
  salt: Buffer;
  serverKey: Buffer;
  storedKey: Buffer;
}

interface References {
  inbox: Status[];
  actor: Actor | null;
}

const generateKeyPairAsync = promisify(generateKeyPair);

export default class LocalAccount extends Relation<Properties, References> {
  id?: string;
  readonly actor?: Reference<Actor | null>;
  readonly admin!: boolean;
  readonly inbox?: Reference<Status[]>;
  readonly privateKeyDer!: Buffer;
  readonly salt!: Buffer;
  readonly serverKey!: Buffer;
  readonly storedKey!: Buffer;

  async toWebFinger(recover: (error: Error) => unknown): Promise<WebFinger> {
    const actor = await this.select('actor');
    if (!actor) {
      throw recover(new Error('actor not found.'));
    }

    const encodedUserpart = encodeAcctUserpart(actor.username);
    const encodedHost = domainToASCII(this.repository.fingerHost);
    const href = await actor.getUri(recover);

    if (!href) {
      throw recover(new Error('actor\'s uri not found.'));
    }

    return {
      subject: `acct:${encodedUserpart}@${encodedHost}`,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href,
        }
      ]
    };
  }

  static async create(repository: Repository, username: string, name: string, summary: string, admin: boolean, salt: Buffer, serverKey: Buffer, storedKey: Buffer, recover: (error: Error) => unknown) {
    const account = new this({
      repository,
      actor: new Actor({
        repository,
        username,
        host: null,
        name,
        summary: sanitizeHtml(summary)
      }),
      admin,
      privateKeyDer: (await generateKeyPairAsync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { format: 'der', type: 'pkcs1' }
      })).privateKey,
      salt,
      serverKey,
      storedKey
    });

    const actor = await account.select('actor');
    if (!actor) {
      throw new Error('actor not found.');
    }
    
    actor.validate(recover);
    await repository.insertLocalAccount(account);

    return account;
  }
}

LocalAccount.references = {
  inbox: {
    query: LocalAccount.withRepository('selectRecentStatusesIncludingExtensionsAndActorsFromInbox'),
    id: 'id'
  },
  actor: {
    query: LocalAccount.withRepository('selectActorById'),
    id: 'id',
    inverseOf: 'account'
  }
};
