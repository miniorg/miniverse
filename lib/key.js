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

import { verifySignature } from 'http-signature';
import { domainToASCII } from 'url';
import { encodeSegment } from './uri';

const { extractPublic, generate } =
  (process.env.NODE_ENV == 'test' ? require : __non_webpack_require__)(
    '../key/build/Release');

export { generate };

export default class {
  constructor(properties) {
    Object.assign(this, properties);
  }

  async getUri() {
    const { owner, repository } = this;

    await repository.loadPerson(owner);

    if (owner.host) {
      const account = await repository.selectRemoteAccountByPerson(owner);
      const { uri } = await account.selectPublicKeyUri();

      return uri;
    }

    const host = domainToASCII(repository.host);
    const username = encodeSegment(owner.username);

    return `https://${host}/@${username}#key`;
  }

  async verifySignature(signature) {
    const { repository, owner } = this;
    const account = await repository.selectRemoteAccountByPerson(owner);

    return verifySignature(signature, account.publicKey.publicKeyPem);
  }

  async selectPrivateKeyPem() {
    const { privateKeyPem } =
      await this.repository.selectLocalAccountByPerson(this.owner);

    return privateKeyPem;
  }

  async toActivityStreams() {
    const [id, owner, privateKeyPem] = await Promise.all([
      this.getUri(),
      this.repository
          .loadPerson(this.owner)
          .then(() => this.owner.getUri()),
      this.selectPrivateKeyPem()
    ]);

    return {
      id,
      type: 'Key',
      owner,
      publicKeyPem: extractPublic(privateKeyPem)
    };
  }
}
