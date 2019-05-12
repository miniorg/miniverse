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

import { readable } from 'svelte/store';

export function listenEventSource() {
  const eventSource = new EventSource(`https://${location.host}/api/events`);
  let inbox: unknown[] = [];

  return readable(inbox, set => {
    eventSource.onmessage = ({ data }) => {
      const { type, orderedItems } = JSON.parse(data);

      if (type == 'OrderedCollectionPage') {
        inbox = orderedItems.reverse().concat(inbox);
        set(inbox);
      }
    };

    return () => eventSource.close();
  });
}
