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

import { postToInbox } from '../../../../lib/transfer';

export default async (repository, { data: { id } }) => {
  const follow = await repository.selectFollowIncludingActorAndObjectById(id);
  const [sender, inboxURI] = await Promise.all([
    follow.select('actor').then(actor => actor.select('account')),
    follow.select('object')
          .then(actor => actor.select('account'))
          .then(account => account.select('inboxURI'))
  ]);

  await postToInbox(repository, sender, inboxURI, follow);
};
