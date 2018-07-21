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

import postToInbox from '../../../../lib/transfer/post_to_inbox';
import Create from '../../../../lib/tuples/create';
import Note from '../../../../lib/tuples/note';

export default async (repository, { data: { statusId, inboxURIId } }) => {
  const [[activity, sender], inboxURI] = await Promise.all([
    repository.selectStatusIncludingExtensionById(statusId).then(status =>
      Promise.all([
        status.select('extension').then(object =>
          object instanceof Note ? new Create({ repository, object }) : object),
        status.select('actor').then(actor => actor.select('account'))
      ])),
    repository.selectURIById(inboxURIId)
  ]);

  await postToInbox(repository, sender, inboxURI, activity);
};
