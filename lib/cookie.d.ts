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

import LocalAccount from './local_account';
import Relation, { Reference } from './relation';
import Repository from './repository';

interface BaseProperties {
  digest: Buffer;
}

interface AccountIdProperties {
  accountId: string;
}

interface AccountProperties {
  accountId?: string;
  account: LocalAccount;
}

interface References {
  account: LocalAccount | null;
}

type Properties = BaseProperties & (AccountIdProperties | AccountProperties);

export function digestToken(this: void, token: string): Buffer;
export function getToken(this: void, digest: Buffer): Buffer;

export default class Cookie extends Relation<Properties, References> {
  static create(repository: Repository, account: LocalAccount, secret: Buffer):
    Promise<Cookie>;

  private account?: Reference<LocalAccount | null>;
  readonly digest: Buffer;
}
