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

import Accept from '../../../../lib/accept';
import LocalAccount from '../../../../lib/local_account';
import RemoteAccount from '../../../../lib/remote_account';
import postToInbox from '../../../../lib/transfer/post_to_inbox';

export default async (repository, { data: { objectId } }) => {
  const accept = new Accept({ objectId, repository });

  const object = await accept.select('object');
  if (!object) {
    throw new Error;
  }

  const [sender, inboxURI] = await Promise.all([
    object.select('object').then(actor => {
      if (actor) {
        return actor.select('account');
      }

      throw new Error;
    }),
    object.select('actor').then(async actor => {
      if (actor) {
        const account = await actor.select('account');
        if (account instanceof RemoteAccount) {
          return account.select('inboxURI');
        }
      }

      throw new Error;
    })
  ]);

  if (!(sender instanceof LocalAccount) || !inboxURI) {
    throw new Error;
  }

  await postToInbox(repository, sender, inboxURI, accept);
};
