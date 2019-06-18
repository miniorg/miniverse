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
import { BinaryLike, createHash } from 'crypto';
import Repository from '../repository';
import LocalAccount from './local_account';
import Relation, { Reference } from './relation';

function digest(secret: BinaryLike) {
  const hash = createHash('sha1');
  hash.update(secret);
  return hash.digest();
}

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

export function digestToken(token: string) {
  return digest(Buffer.from(token, 'base64'));
}

export function getToken(secret: Buffer) {
  return secret.toString('base64');
}

export default class Cookie extends Relation<Properties, References> {
  readonly account?: Reference<LocalAccount | null>;
  readonly accountId!: string;
  readonly digest!: Buffer;

  static create(
    repository: Repository,
    account: LocalAccount,
    secret: Buffer,
    signal: AbortSignal,
    recover: (error: Error & { name: string }) => unknown
  ) {
    return repository.insertCookie(
      { account, digest: digest(secret) },
      signal,
      recover);
  }
}

Cookie.references = {
  account: {
    query: Cookie.withRepository('selectLocalAccountById'),
    id: 'accountId'
  }
};
