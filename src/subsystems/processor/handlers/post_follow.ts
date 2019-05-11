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

import { Job } from 'bull';
import { Custom as CustomError } from '../../../lib/errors';
import Repository from '../../../lib/repository';
import { postToInbox } from '../../../lib/transfer';
import LocalAccount from '../../../lib/tuples/local_account';
import RemoteAccount from '../../../lib/tuples/remote_account';

interface Data {
  readonly id: string;
}

export default async function (repository: Repository, { data }: Job<Data>) {
  const follow = await repository.selectFollowIncludingActorAndObjectById(data.id);

  if (!follow) {
    throw new CustomError('The follow is undone.', 'error');
  }

  const [sender, inboxURI] = await Promise.all([
    follow.select('actor').then(actor => {
      if (!actor) {
        throw new CustomError('The actor is deleted.', 'error');
      }

      return actor.select('account');
    }),
    follow.select('object').then(async actor => {
      if (!actor) {
        throw new CustomError('The object is deleted.', 'error');
      }

      const account = await actor.select('account');
      if (!(account instanceof RemoteAccount)) {
        throw new CustomError('The object\'s account is invalid.', 'error');
      }

      return account.select('inboxURI');
    })
  ]);

  if (!(sender instanceof LocalAccount)) {
    throw new CustomError('The actor\'s account is invalid.', 'error');
  }

  if (!inboxURI) {
    throw new CustomError('The inbox URI cannot be resolved.', 'error');
  }

  await postToInbox(repository, sender, inboxURI, follow);
}
