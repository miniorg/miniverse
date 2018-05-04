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

import Challenge from '../challenge';

function createKey(digest) {
  const buffer = Buffer.allocUnsafe('challenges:'.length + digest.byteLength);

  buffer.write('challenges:');
  digest.copy(buffer, 'challenges:'.length);

  return buffer;
}

export default {
  insertChallenge(token) {
    const key = createKey(token.digest);

    this.loadeds.add(token);
    return this.redis.client.setex(key, 1048576, '');
  },

  async selectChallengeByDigest(digest) {
    if (await this.redis.client.get(createKey(digest)) == null) {
      return null;
    }

    const token = new Challenge({ digest });

    this.loadeds.add(token);
    return token;
  }
};
