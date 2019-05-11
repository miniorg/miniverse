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

import Challenge from '../tuples/challenge';
import Repository from '.';

function createKey(this: Repository, digest: Buffer) {
  const repositoryPrefixLength = Buffer.byteLength(this.redis.prefix);
  const challengesPrefixLength = Buffer.byteLength('challenges:');
  const buffer = Buffer.allocUnsafe(
    repositoryPrefixLength + challengesPrefixLength + digest.byteLength);

  buffer.write(this.redis.prefix);
  buffer.write('challenges:', repositoryPrefixLength);
  digest.copy(buffer, repositoryPrefixLength + challengesPrefixLength);

  return buffer;
}

export default class {
  async insertChallenge(this: Repository, { digest }: Challenge) {
    const key = createKey.call(this, digest);
    await this.redis.client.setex(key, 1048576, '');
  }

  async selectChallengeByDigest(this: Repository, digest: Buffer) {
    if (await this.redis.client.get(createKey.call(this, digest)) == null) {
      return null;
    }

    return new Challenge({ digest });
  }
}
