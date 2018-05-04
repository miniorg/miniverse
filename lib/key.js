/*
  Copyright (C) 2018  Akihiko Odaki <nekomanma@pixiv.co.jp>

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

import { verifySignature } from 'http-signature';
import { domainToASCII } from 'url';
import URI from './uri';

const { extractPublic, generate } =
  (process.env.NODE_ENV == 'test' ? require : __non_webpack_require__)(
    '../key/build/Release/key');

export default class Key {
  constructor(properties) {
    Object.assign(this, properties);
  }

  async getUri(repository) {
    await repository.loadPerson(this.owner);

    if (this.owner.host) {
      const account = await repository.selectRemoteAccountByPerson(this.owner);
      return account.publicKey.uri;
    }

    const host = domainToASCII(repository.host);
    const username = URI.encodeSegment(this.owner.username);

    return `https://${host}/@${username}#key`;
  }

  async verifySignature(repository, signature) {
    const account = await repository.selectRemoteAccountByPerson(this.owner);
    return verifySignature(signature, account.publicKey.publicKeyPem);
  }

  async selectPrivateKeyPem(repository) {
    const { privateKeyPem } =
      await repository.selectLocalAccountByPerson(this.owner);

    return privateKeyPem;
  }

  async toActivityStreams(repository) {
    return {
      id: await this.getUri(repository),
      type: 'Key',
      publicKeyPem: extractPublic(await this.selectPrivateKeyPem(repository))
    };
  }
}

Key.generate = generate;
