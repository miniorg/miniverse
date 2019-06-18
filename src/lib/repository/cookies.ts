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
import Cookie from '../tuples/cookie';
import LocalAccount from '../tuples/local_account';
import Repository from '.';

export default class {
  async insertCookie(this: Repository, { account, digest }: {
    readonly account: LocalAccount;
    readonly digest: Buffer;
  }, signal: AbortSignal, recover: (error: Error & { name: string }) => unknown) {
    await this.pg.query({
      name: 'insertCookie',
      text: 'INSERT INTO cookies (digest, account_id) VALUES ($1, $2)',
      values: [digest, account.id]
    }, signal, error => error.name == 'AbortError' ? recover(error) : error);

    return new Cookie({ repository: this, account, digest });
  }
}
