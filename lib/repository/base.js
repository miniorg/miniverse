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

import Pg from './pg';
import Syslog from './syslog';

const Bull = require('bull');
const Redis = require('ioredis');

export default function Repository({ analytics, captcha, console, content, host, fingerHost, pg, s3, redis }) {
  this.analytics = analytics;
  this.captcha = captcha;
  this.console = new Syslog(console);
  this.content = content;
  this.listeners = Object.create(null);
  this.host = host;
  this.fingerHost = fingerHost || host;
  this.pg = new Pg(pg);
  this.s3 = s3;

  this.redis = {
    prefix: redis.prefix || 'miniverse:',
    url: redis.url,
    client: new Redis(redis.url),
    subscriber: new Redis(redis.url)
  };

  this.queue = new Bull('HTTP', {
    createClient: (function(type) {
      switch (type) {
      case 'client':
        return this.client;

      case 'subscriber':
        return this.subscriber;

      default:
        return new Redis(this.url);
      }
    }).bind(this.redis),
    prefix: this.redis.prefix + 'bull'
  });

  this.redis.subscriber.on('message', (channel, message) => {
    for (const listen of this.listeners[channel]) {
      listen(channel, message);
    }
  });
}
