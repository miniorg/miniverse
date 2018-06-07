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

import { createHash } from 'crypto';
import Relation, { withRepository } from './relation';
const base64url = require('base64url');

function digest(secret) {
  const hash = createHash('sha1');
  hash.update(secret);
  return hash.digest();
}

export function digestToken(token) {
  return digest(base64url.toBuffer(token));
}

export const getToken = base64url;

export default class Cookie extends Relation {
  static async create(repository, account, secret) {
    const cookie = new this({ account, digest: digest(secret) });

    await repository.insertCookie(cookie);
    return cookie;
  }
}

Cookie.references = {
  account: { query: withRepository('selectLocalAccountById'), id: 'person_id' }
};
