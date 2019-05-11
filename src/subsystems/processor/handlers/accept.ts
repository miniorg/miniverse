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
import Accept from '../../../lib/tuples/accept';
import LocalAccount from '../../../lib/tuples/local_account';
import RemoteAccount from '../../../lib/tuples/remote_account';

interface Data {
  readonly objectId: string;
}

export default async function(repository: Repository, { data }: Job<Data>) {
  const accept = new Accept({ objectId: data.objectId, repository });

  const object = await accept.select('object');
  if (!object) {
    throw new CustomError(
      'Object to accept not found. Possibly deleted?', 'info');
  }

  const [sender, inboxURI] = await Promise.all([
    object.select('object').then(actor => {
      if (actor) {
        return actor.select('account');
      }

      throw new CustomError('Object of follow activity not found.', 'error');
    }),
    object.select('actor').then(async actor => {
      if (actor) {
        const account = await actor.select('account');
        if (account instanceof RemoteAccount) {
          return account.select('inboxURI');
        }
      }

      throw new CustomError('Actor of follow activity not found.', 'error');
    })
  ]);

  if (!(sender instanceof LocalAccount) || !inboxURI) {
    throw new CustomError('Invalid accept activity to post to remote', 'error');
  }

  await postToInbox(repository, sender, inboxURI, accept);
}
