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

export default {
  async subscribe(channel, listen) {
    if (this.listeners[channel]) {
      this.listeners[channel].add(listen);
    } else {
      this.listeners[channel] = new Set([listen]);

      const subscription = this.redis.subscriber.subscribe(channel);

      subscription.catch(() => {
        if (this.listeners[channel].size <= 1) {
          delete this.listeners[channel];
        } else {
          this.listeners[channel].delete(listen);
        }
      });

      return subscription;
    }
  },

  async unsubscribe(channel, listen) {
    if (this.listeners[channel].size <= 1) {
      delete this.listeners[channel];

      return this.redis.subscriber.unsubscribe(channel);
    }

    this.listeners[channel].delete(listen);
  }
};
