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
    const { username, host } = await this.owner.get();

    if (host) {
      const complete = await this.owner.selectComplete();
      const { publicKey } = await complete.get();
      return publicKey.uri;
    }

    const repositoryHost = domainToASCII(this.repository.host);
    const encodedUsername = encodeSegment(username);

    return `https://${repositoryHost}/@${encodedUsername}#key`;
  }

  async verifySignature(signature) {
    const complete = await this.owner.selectComplete();
    const { publicKey } = await complete.get();

    return verifySignature(signature, publicKey.publicKeyPem);
  }

  async selectPrivateKeyPem() {
    const complete = await this.owner.selectComplete();
    const { privateKeyPem } = await complete.get();

    return privateKeyPem;
  }

  async toActivityStreams() {
    const [id, owner, privateKeyPem] = await Promise.all([
      this.getUri(),
      this.owner.getUri(),
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
