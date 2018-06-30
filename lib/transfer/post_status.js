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

export default async (repository, status) => {
  const actor = await status.select('actor');
  const followers = await actor.select('followers');

  await Promise.all([
    actor.host || Promise.all(followers.map(
      recipient => recipient.host ? recipient.select('account') : null)).then(
        followers => {
          followers = followers.filter(Boolean);
          const set = new Set(followers.map(({ inboxURIId }) => inboxURIId));

          return Promise.all((function *() {
            for (const inboxURIId of set) {
              yield repository.queue.add({
                type: 'postStatus',
                statusId: status.id,
                inboxURIId
              });
            }
          })());
        }),
    repository.insertIntoInboxes(
      followers.concat([actor]).filter(recipient => !recipient.host),
      status)
  ]);
};
