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

import { AbortSignal } from 'abort-controller';
import { createPublicKey } from 'crypto';
import { verifySignature } from 'http-signature';
import { domainToASCII } from 'url';
import { Key as ActivityStreams } from '../generated_activitystreams';
import Actor from './actor';
import LocalAccount from './local_account';
import Relation, { Reference } from './relation';
import RemoteAccount from './remote_account';
import { encodeSegment } from './uri';

type Properties = { ownerId: string } | { ownerId?: string; owner: Actor };

export default class Key extends Relation<Properties, { owner: Actor | null }> {
  readonly owner?: Reference<Actor | null>;
  readonly ownerId!: string;

  async getUri(
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ) {
    const owner = await this.select('owner', signal, recover);

    if (!owner) {
      throw recover(new Error('owner not found.'));
    }

    if (owner.host) {
      const account = await owner.select('account', signal, recover);
      if (!account) {
        throw recover(new Error('owner\'s account not found'));
      }

      if (!(account instanceof RemoteAccount)) {
        throw new Error('Unexpected owner\'s account type');
      }

      const uri = await account.select('publicKeyURI', signal, recover);
      if (!uri) {
        throw recover(new Error('owner\'s publicKeyURI not found.'));
      }

      return uri.uri;
    }

    const host = domainToASCII(this.repository.host);
    const username = encodeSegment(owner.username);

    return `https://${host}/@${username}#key`;
  }

  async verifySignature(
    signature: {},
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ) {
    const owner = await this.select('owner', signal, recover);
    if (!owner) {
      throw recover(new Error('owner not found.'));
    }

    const account = await owner.select('account', signal, recover);
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

  async selectPrivateKeyDer(
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ) {
    const owner = await this.select('owner', signal, recover);
    if (!owner) {
      throw recover(new Error('owner not found.'));
    }
  
    const account = await owner.select('account', signal, recover);
    if (!(account instanceof LocalAccount)) {
      throw recover(new Error('owner\'s account invalid'));
    }

    return account.privateKeyDer;
  }

  async toActivityStreams(
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ): Promise<ActivityStreams> {
    const [id, owner, key] = await Promise.all([
      this.getUri(signal, recover),
      this.select('owner', signal, recover).then(owner => {
        if (!owner) {
          throw recover(new Error('owner not found.'));
        }

        return owner.getUri(signal, recover);
      }),
      this.selectPrivateKeyDer(signal, recover)
    ]);

    if (!owner) {
      throw recover(new Error('owner\'s uri not found.'));
    }

    const publicKeyPem = createPublicKey({
      format: 'der',
      type: 'pkcs1',
      key
    }).export({ format: 'pem', type: 'pkcs1' });

    if (typeof publicKeyPem != 'string') {
      throw new Error('Invalid public key.');
    }

    return { id, type: 'Key', owner, publicKeyPem };
  }
}

Key.references =
  { owner: { query: Key.withRepository('selectActorById'), id: 'ownerId' } };
