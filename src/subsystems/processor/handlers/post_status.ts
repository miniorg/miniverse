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
import Create from '../../../lib/tuples/create';
import LocalAccount from '../../../lib/tuples/local_account';
import Note from '../../../lib/tuples/note';

interface Data {
  readonly statusId: string;
  readonly inboxURIId: string;
}

export default async function(repository: Repository, { data }: Job<Data>, signal: AbortSignal, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  const [[activity, sender], inboxURI] = await Promise.all([
    repository.selectStatusIncludingExtensionById(data.statusId, signal, recover).then(status => {
      if (!status) {
        throw recover(new Error('Status not found.'));
      }

      return Promise.all([
        status.select('extension', signal, recover).then(object =>
          object instanceof Note ? new Create({ repository, object }) : object),
        status.select('actor', signal, recover).then(actor => {
          if (!actor) {
            throw recover(new Error('actor not found.'));
          }

          return actor.select('account', signal, recover);
        })
      ]);
    }),
    repository.selectURIById(data.inboxURIId, signal, recover)
  ]);

  if (!activity) {
    throw new Error('Status extension not found.');
  }

  if (!(sender instanceof LocalAccount)) {
    throw recover(new Error('actor\'s account invalid.'));
  }

  if (!inboxURI) {
    throw recover(new Error('actor\'s inboxURI not found.'));
  }

  await postToInbox(repository, sender, inboxURI, activity as any, signal, recover);
}
