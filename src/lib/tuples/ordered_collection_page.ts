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
import { Any, OrderedCollectionPage } from '../generated_activitystreams';

const recovery = {};

interface ToActivityStreams {
  toActivityStreams(
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ): Promise<Any>;
}

export default class {
  readonly orderedItems: ToActivityStreams[];

  constructor({ orderedItems }: { readonly orderedItems: ToActivityStreams[] }) {
    this.orderedItems = orderedItems;
  }

  async toActivityStreams(
    signal: AbortSignal,
    recover: (error: Error & { name: string }) => unknown
  ): Promise<OrderedCollectionPage> {
    return {
      type: 'OrderedCollectionPage',
      orderedItems: (await Promise.all(this.orderedItems.map(
        item => item.toActivityStreams(
          signal,
          error => error.name == 'AbortError' ? recover(error) : recovery
        ).catch(error => {
          if (error != recovery) {
            throw error;
          }

          return recovery;
        })
      ))).filter(item => item != recovery) as Any[]
    };
  }
}
