/*
  Copyright (C) 2018  Akihiko Odaki <nekomanma@pixiv.co.jp>

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

import { parse } from 'cookie';
import { randomBytes } from 'crypto';
import { createServer } from 'http';
import sapper from 'sapper';
import { promisify } from 'util';
import Challenge from '../../../lib/challenge';
import Cookie from '../../../lib/cookie';
import Store from '../../../lib/store';
import { routes } from '../../manifest/server';
import createStreaming from './streaming';
const Arena = require('bull-arena');
const express = require('express');

const promisifiedRandomBytes = promisify(randomBytes);

export default (repository, port) => {
  const application = express();
  const server = createServer(application);

  createStreaming(repository, server);

  application.use(
    express.static('assets'),
    (request, response, next) => {
      request.repository = repository;
      next();
    },
    (request, response, next) => {
      const cookie = request.headers.cookie && parse(request.headers.cookie);
      let asyncPerson;

      if (cookie && cookie.miniverse) {
        const digest = Cookie.digest(Cookie.parseToken(cookie.miniverse));
        asyncPerson = repository.selectPersonByDigestOfCookie(digest);
      } else {
        asyncPerson = Promise.resolve();
      }

      asyncPerson.then(async person => {
        if (/^\/bull/i.test(request.path)) {
          if (!person) {
            response.sendStatus(401);
            return;
          }

          const { admin } = await repository.selectLocalAccountByPerson(person);
          if (!admin) {
            response.sendStatus(401);
            return;
          }

          next();
        } else if (person) {
          const { body } = await person.toActivityStreams(repository);
          const user = await body;
          user.inbox = [];

          request.nonce = null;
          request.user = user;
          next();
        } else {
          const bytes = await promisifiedRandomBytes(64);

          request.nonce = Challenge.getToken(bytes);
          request.user = null;

          await Challenge.create(repository, bytes);
          next();
        }
      }).catch(next);
    },
    Arena({
      queues: [
        { hostId: repository.host, name: 'HTTP', url: repository.redis.url }
      ]
    }, { basePath: '/bull', disableListen: true }),
    sapper({
      routes,
      store({ nonce, user }) {
        return new Store({ nonce, user, streaming: null });
      }
    }));

  server.listen(port).on('error', repository.console.error);

  return server;
};
