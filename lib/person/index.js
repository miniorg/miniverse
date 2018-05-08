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

import { domainToASCII } from 'url';
import Key from '../key';
import RemoteAccount from '../remote_account';
import URI from '../uri';
import Resolver from './resolver';

export default class Person {
  constructor(properties) {
    Object.assign(this, properties);

    if (this.account) {
      this.account.person = this;
    }
  }

  validate() {
    if (!/^[\w-.~!$&'()*+,;=].*$/.test(this.username)) {
      throw new Error;
    }
  }

  async getUri(repository) {
    if (this.host) {
      const { uri } = await repository.selectRemoteAccountByPerson(this);
      return uri;
    }

    const host = domainToASCII(repository.host);
    const username = URI.encodeSegment(this.username);

    return `https://${host}/@${username}`;
  }

  async toActivityStreams(repository) {
    if (this.host) {
      const host = domainToASCII(repository.host);
      const acct = URI.encodeSegment(`${this.username}@${this.host}`);
      const id = `https://${host}/@${acct}`;

      return {
        id,
        type: 'Person',
        preferredUsername: this.username,
        inbox: id + '/inbox',
        outbox: id + '/outbox'
      };
    }

    const [id, publicKey, { salt }] = await Promise.all([
      this.getUri(repository),
      (new Key({ owner: this })).toActivityStreams(repository),
      repository.selectLocalAccountByPerson(this)
    ]);

    return {
      id,
      type: 'Person',
      preferredUsername: this.username,
      inbox: id + '/inbox',
      outbox: id + '/outbox',
      publicKey,
      'miniverse:salt': salt.toString('base64')
    };
  }

  static async fromParsedActivityStreams(repository, host, object) {
    const asyncPublicKey = object.getPublicKey(repository);
    const [
      id,
      inboxId,
      username,
      publicKey,
      publicKeyId,
      publicKeyPem
    ] = await Promise.all([
      object.getId(),
      object.getInbox(repository).then(inbox => inbox.getId()),
      object.getPreferredUsername(repository),
      asyncPublicKey,
      asyncPublicKey.then(publicKey => publicKey.getId()),
      asyncPublicKey.then(publicKey => publicKey.getPublicKeyPem(repository))
    ]);

    if (object.normalizedHost != publicKey.normalizedHost) {
      throw new Error;
    }

    const { person } = await RemoteAccount.create(
      repository,
      username,
      host,
      id,
      { uri: inboxId },
      { uri: publicKeyId, publicKeyPem });

    return person;
  }
}

Object.assign(Person, Resolver);
