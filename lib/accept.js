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

import { request } from 'https';
import { URL } from 'url';
import { sign } from 'http-signature';
import ActivityStreams, { AnyHost } from './activitystreams';
import Key from './key';

export default class {
  constructor(properties) {
    Object.assign(this, properties);
  }

  async toActivityStreams(repository) {
    await repository.loadFollowIncludingActorAndObject(this.object);
    const { body } = await this.object.toActivityStreams(repository);

    return new ActivityStreams({ type: 'Accept', object: await body }, AnyHost);
  }

  static async create(repository, object) {
    const accept = new this({ object });
    const [actor, objectAccount] = await Promise.all([
      object.selectPersonByObject(repository),
      object.selectRemoteAccountByActor(repository)
    ]);

    if (!actor.host && objectAccount) {
      const { protocol, hostname, port, pathname, search } =
        new URL(objectAccount.inbox.uri);

      const key = new Key({ owner: actor });

      const [activityStreams, keyId, privateKeyPem] = await Promise.all([
        accept.toActivityStreams(repository),
        key.getUri(repository),
        key.selectPrivateKeyPem(repository)
      ]);

      await new Promise((resolve, reject) => {
        const clientRequest = request({
          protocol,
          headers: { 'User-Agent': repository.userAgent },
          hostname,
          port,
          path: pathname + search,
          method: 'POST'
        }, response => {
          response.on('data', Function.prototype);
          response.on('end', resolve);
        });

        clientRequest.on('error', reject);

        sign(clientRequest, {
          authorizationHeaderName: 'Signature',
          key: privateKeyPem,
          keyId
        });

        activityStreams['@context'] = 'https://www.w3.org/ns/activitystreams';
        clientRequest.end(JSON.stringify(activityStreams));
      });
    }

    return accept;
  }
}
