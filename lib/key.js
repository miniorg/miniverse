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
import Relation, { withRepository } from './relation';
import { encodeSegment } from './uri';

const { extractPublic, generate } =
  (process.env.NODE_ENV == 'test' ? require : __non_webpack_require__)(
    '../key/build/Release');

export { generate };

export default class Key extends Relation {
  async getUri() {
    const owner = await this.select('owner');

    if (owner.host) {
      const account = await owner.select('account');
      const { uri } = await account.select('publicKeyURI');

      return uri;
    }

    const host = domainToASCII(this.repository.host);
    const username = encodeSegment(owner.username);

    return `https://${host}/@${username}#key`;
  }

  async verifySignature(signature) {
    const owner = await this.select('owner');
    const account = await owner.select('account');

    return verifySignature(signature, account.publicKey.publicKeyPem);
  }

  async selectPrivateKeyPem() {
    const owner = await this.select('owner');
    const { privateKeyPem } = await owner.select('account');

    return privateKeyPem;
  }

  async toActivityStreams() {
    const [id, owner, privateKeyPem] = await Promise.all([
      this.getUri(),
      this.select('owner').then(owner => owner.getUri()),
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

Key.references =
  { owner: { query: withRepository('selectPersonById'), id: 'ownerId' } };
