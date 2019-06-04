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
import { Job } from 'bull';
import Repository from '../../../lib/repository';
import { postToInbox, temporaryError } from '../../../lib/transfer';
import LocalAccount from '../../../lib/tuples/local_account';
import RemoteAccount from '../../../lib/tuples/remote_account';

interface Data {
  readonly id: string;
}

export default async function (repository: Repository, { data }: Job<Data>, signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  const follow = await repository.selectFollowIncludingActorAndObjectById(data.id);

  if (!follow) {
    throw recover(new Error('Follow not found.'));
  }

  const [sender, inboxURI] = await Promise.all([
    follow.select('actor').then(actor => {
      if (!actor) {
        throw new Error('actor not found.');
      }

      return actor.select('account');
    }),
    follow.select('object').then(async actor => {
      if (!actor) {
        throw new Error('object not found.');
      }

      const account = await actor.select('account');
      if (!(account instanceof RemoteAccount)) {
        throw recover(new Error('object\'s account invalid'));
      }

      return account.select('inboxURI');
    })
  ]);

  if (!(sender instanceof LocalAccount)) {
    throw recover(new Error('actor\'s account invalid'));
  }

  if (!inboxURI) {
    throw recover(new Error('object\'s inbox not found.'));
  }

  await postToInbox(repository, sender, inboxURI, follow, signal, recover);
}
