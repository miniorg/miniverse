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

import { createPublicKey } from 'crypto';
import { verifySignature } from 'http-signature';
import { domainToASCII } from 'url';
import Actor from './actor';
import LocalAccount from './local_account';
import Relation, { Reference } from './relation';
import RemoteAccount from './remote_account';
import { encodeSegment } from './uri';

type Properties = { ownerId: string } | { ownerId?: string; owner: Actor };

export default class Key extends Relation<Properties, { owner: Actor | null }> {
  readonly owner?: Reference<Actor | null>;
  readonly ownerId!: string;

  async getUri(recover: (error: Error) => unknown) {
    const owner = await this.select('owner');

    if (!owner) {
      throw recover(new Error('owner not found.'));
    }

    if (owner.host) {
      const account = await owner.select('account');
      if (!account) {
        throw recover(new Error('owner\'s account not found'));
      }

      if (!(account instanceof RemoteAccount)) {
        throw new Error('Unexpected owner\'s account type');
      }

      const uri = await account.select('publicKeyURI');
      if (!uri) {
        throw recover(new Error('owner\'s publicKeyURI not found.'));
      }

      return uri.uri;
    }

    const host = domainToASCII(this.repository.host);
    const username = encodeSegment(owner.username);

    return `https://${host}/@${username}#key`;
  }

  async verifySignature(signature: {}, recover: (error: Error) => unknown) {
    const owner = await this.select('owner');
    if (!owner) {
      throw recover(new Error('owner not found.'));
    }

    const account = await owner.select('account');
    if (!(account instanceof RemoteAccount)) {
      throw recover(new Error('owner\'s account invalid.'));
    }

    const publicKeyPem = createPublicKey({
      format: 'der',
      type: 'pkcs1',
      key: account.publicKeyDer
    }).export({ format: 'pem', type: 'pkcs1' });

    return verifySignature(signature, publicKeyPem as string);
  }

  async selectPrivateKeyDer(recover: (error: Error) => unknown) {
    const owner = await this.select('owner');
    if (!owner) {
      throw recover(new Error('owner not found.'));
    }
  
    const account = await owner.select('account');
    if (!(account instanceof LocalAccount)) {
      throw recover(new Error('owner\'s account invalid'));
    }

    return account.privateKeyDer;
  }

  async toActivityStreams(recover: (error: Error) => unknown) {
    const [id, owner, key] = await Promise.all([
      this.getUri(recover),
      this.select('owner').then(owner => {
        if (!owner) {
          throw recover(new Error('owner not found.'));
        }

        return owner.getUri(recover);
      }),
      this.selectPrivateKeyDer(recover)
    ]);

    return {
      id,
      type: 'Key',
      owner,
      publicKeyPem: createPublicKey({
        format: 'der',
        type: 'pkcs1',
        key
      }).export({ format: 'pem', type: 'pkcs1' })
    };
  }
}

Key.references =
  { owner: { query: Key.withRepository('selectActorById'), id: 'ownerId' } };
