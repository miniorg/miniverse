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

import { parse } from 'cookie';
import { randomBytes } from 'crypto';
import { promisify } from 'util';
import { domainToASCII } from 'url';
import { middleware as sapper } from '@sapper/server';
import Repository from '../lib/repository';
import { User } from '../lib/session/types';
import Challenge from '../lib/tuples/challenge';
import { digestToken } from '../lib/tuples/cookie';
import LocalAccount from '../lib/tuples/local_account';
import Arena = require('bull-arena');
import express = require('express');

const actorError = {};
const promisifiedRandomBytes = promisify(randomBytes);

export interface Application extends express.Application {
  readonly locals: {
    repository: Repository;
  };
}

export interface Response extends express.Response {
  readonly app: Application;
  readonly locals: {
    nonce: string;
    user: LocalAccount | null;
    userActivityStreams: User | null;
  };
}

export default function (repository: Repository, port: number): Application {
  const application = express();

  application.locals.repository = repository;

  application.use(
    express.static('static'),
    (request, response, next) => {
      const { locals }: Response = response;
      const cookie = request.headers.cookie && parse(request.headers.cookie);
      let asyncAccount;

      if (cookie && cookie.miniverse) {
        const digest = digestToken(cookie.miniverse);
        asyncAccount = repository.selectLocalAccountByDigestOfCookie(digest);
      } else {
        asyncAccount = Promise.resolve(null) as Promise<LocalAccount | null>;
      }

      response.set('Referrer-Policy', 'same-origin');

      asyncAccount.then(async account => {
        if (/^\/bull/i.test(request.path)) {
          if (!account || !account.admin) {
            response.sendStatus(403);
          }
        } else {
          const [bytes, actor] = await Promise.all([
            promisifiedRandomBytes(64),
            account && account.select('actor').then(async actor => {
              if (actor) {
                try {
                  const activityStreams = await actor.toActivityStreams(() => actorError) as User;
                  activityStreams.inbox = [];
                  locals.user = account;
                  locals.userActivityStreams = activityStreams;
                } catch (error) {
                  if (error != actorError) {
                    throw error;
                  }

                  actor = null;
                }
              }

              return actor;
            })
          ]);

          locals.nonce = bytes.toString('base64');

          if (process.env.NODE_ENV != 'development') {
            response.set('Content-Security-Policy', `default-src 'none'; connect-src 'self' data:; frame-src ${repository.content.frame.sourceList}; img-src ${repository.content.image.sourceList};script-src 'self' 'nonce-${locals.nonce}' ${repository.content.script.sourceList}`);
          }

          if (!actor) {
            locals.user = null;
            locals.userActivityStreams = null;

            await Challenge.create(repository, bytes);
          }
        }
      }).then(next, next);
    },
    Arena({
      queues: [
        {
          hostId: repository.host,
          name: 'HTTP',
          prefix: repository.redis.prefix + 'bull',
          url: repository.redis.url
        }
      ]
    }, { basePath: '/bull', disableListen: true }),
    sapper({
      session(_request: express.Request, { locals }: Response) {
        const host = domainToASCII(repository.host);

        return {
          analytics: repository.analytics,
          captcha: repository.captcha.site,
          endpoints: { proxyUrl: `https://${host}/api/proxy` },
          nonce: locals.nonce,
          scripts: repository.content.script.sources,
          user: locals.userActivityStreams,
          fingerHost: repository.fingerHost
        };
      }
    }));

  application.listen(port).on('error', repository.console.error);

  return application;
}
