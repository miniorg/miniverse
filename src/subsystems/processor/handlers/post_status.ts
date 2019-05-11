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
import Create from '../../../lib/tuples/create';
import LocalAccount from '../../../lib/tuples/local_account';
import Note from '../../../lib/tuples/note';

interface Data {
  readonly statusId: string;
  readonly inboxURIId: string;
}

export default async function(repository: Repository, { data }: Job<Data>) {
  const [[activity, sender], inboxURI] = await Promise.all([
    repository.selectStatusIncludingExtensionById(data.statusId).then(status => {
      if (!status) {
        throw new CustomError('Status not found.', 'error');
      }

      return Promise.all([
        status.select('extension').then(object =>
          object instanceof Note ? new Create({ repository, object }) : object),
        status.select('actor').then(actor => {
          if (!actor) {
            throw new CustomError('Actor not found.', 'error');
          }

          return actor.select('account');
        })
      ]);
    }),
    repository.selectURIById(data.inboxURIId)
  ]);

  if (!activity) {
    throw new CustomError('Status extension not found.', 'error');
  }

  if (!(sender instanceof LocalAccount)) {
    throw new CustomError('Invalid sender\'s account.', 'error');
  }

  if (!inboxURI) {
    throw new CustomError('Inbox URI not found.', 'error');
  }

  await postToInbox(repository, sender, inboxURI, activity);
}
