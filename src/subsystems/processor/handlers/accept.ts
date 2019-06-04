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
import Accept from '../../../lib/tuples/accept';
import LocalAccount from '../../../lib/tuples/local_account';
import RemoteAccount from '../../../lib/tuples/remote_account';

interface Data {
  readonly objectId: string;
}

export default async function(repository: Repository, { data }: Job<Data>, signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  const accept = new Accept({ objectId: data.objectId, repository });

  const object = await accept.select('object');
  if (!object) {
    throw recover(new Error('object not found.'));
  }

  const [sender, inboxURI] = await Promise.all([
    object.select('object').then(actor => {
      if (actor) {
        return actor.select('account');
      }

      throw recover(new Error('object\'s object not found.'));
    }),
    object.select('actor').then(async actor => {
      if (!actor) {
        throw recover(new Error('object\'s actor not found.'));
      }

      const account = await actor.select('account');
      if (!(account instanceof RemoteAccount)) {
        throw recover(new Error('object\'s actor\'s account invalid.'));
      }

      return account.select('inboxURI');
    })
  ]);

  if (!(sender instanceof LocalAccount)) {
    throw recover(new Error('object\'s object\'s account invalid.'));
  }

  if (!inboxURI) {
    throw recover(new Error('object\'s actor\'s inboxURI not found.'));
  }

  await postToInbox(repository, sender, inboxURI, accept, signal, recover);
}
