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

export default async function(repository: Repository, { data }: Job<Data>) {
  const like = await repository.selectLikeById(data.id);
  if (!like) {
    throw new CustomError('The like is undone.', 'error');
  }

  const [sender, inboxURI] = await Promise.all([
    like.select('actor').then(actor => {
      if (!actor) {
        throw new CustomError('The actor is deleted.', 'error');
      }

      return actor.select('account');
    }),
    like.select('object').then(async note => {
      if (!note) {
        throw new CustomError('The object is deleted.', 'error');
      }

      const status = await note.select('status');
      if (!status) {
        throw new CustomError('The object\'s status is deleted.', 'error');
      }

      const actor = await status.select('actor');
      if (!actor) {
        throw new CustomError('The actor which the object is attributed to is deleted.', 'error');
      }

      const account = await actor.select('account');
      if (!(account instanceof RemoteAccount)) {
        throw new CustomError('The account which the object is attributed to is invalid.', 'error');
      }

      return account.select('inboxURI');
    })
  ]);

  if (!(sender instanceof LocalAccount)) {
    throw new CustomError('The actor\'s account is invalid', 'error');
  }

  if (!inboxURI) {
    throw new CustomError('The inbox URI of the actor which the object is attributed to cannot be retrieved.', 'error');
  }

  await postToInbox(repository, sender, inboxURI, like);
}
