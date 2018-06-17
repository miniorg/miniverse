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

import Bull from 'bull';
import Announces from './announces';
import Challenges from './challenges';
import Cookies from './cookies';
import Follows from './follows';
import LocalAccounts from './local_accounts';
import Mentions from './mentions';
import RemoteAccounts from './remote_accounts';
import Notes from './notes';
import Persons from './persons';
import Pg from './pg';
import Statuses from './statuses';
import Subscribers from './subscribers';
import URIs from './uris';
const Redis = require('ioredis');

export default function Repository({ analytics, captcha, console, content, host, fingerHost, pg, redis }) {
  this.analytics = analytics;
  this.captcha = captcha;
  this.console = console;
  this.content = content;
  this.listeners = Object.create(null);
  this.host = host;
  this.fingerHost = fingerHost || host;
  this.pg = new Pg(pg);

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

Object.assign(
  Repository.prototype,
  Announces,
  Challenges,
  Cookies,
  Follows,
  LocalAccounts,
  Mentions,
  RemoteAccounts,
  Notes,
  Persons,
  Statuses,
  Subscribers,
  URIs);
