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

import { promisify } from 'util';
import ParsedActivityStreams,
       { AnyHost, TypeNotAllowed } from '../parsed_activitystreams';
import { encodeAcctUserpart } from '../uri';
const WebFinger = require('webfinger.js');

const webFinger = new WebFinger;
export const lookup = promisify(webFinger.lookup.bind(webFinger));

export default {
  async resolveByUsernameAndNormalizedHost(repository, username, normalizedHost) {
    if (normalizedHost) {
      const account =
        await repository.selectRemoteAccountByUsernameAndNormalizedHost(
          username, normalizedHost);

      if (account) {
        return account.select('person');
      }

      const encodedUsername = encodeAcctUserpart(username);
      const firstFinger = await lookup(`${encodedUsername}@${normalizedHost}`);

      const host = firstFinger.object.subject.split('@', 2)[1];
      const { href } =
        firstFinger.object.links.find(({ rel }) => rel == 'self');
      const activityStreams =
        new ParsedActivityStreams(repository, href, AnyHost);

      await Promise.all([
        activityStreams.getType().then(type => {
          if (!type.has('Person')) {
            throw new TypeNotAllowed;
          }
        }),
        lookup(href).then(secondFinger => {
          if (firstFinger.object.subject != secondFinger.object.subject) {
            throw new Error;
          }
        })
      ]);

      return this.fromHostAndParsedActivityStreams(
        repository, host, activityStreams);
    }

    const account =
      await repository.selectLocalAccountByUsername(username);

    return account.select('person');
  },

  async resolveByKeyUri(repository, keyUri) {
    const keyUriEntity = await repository.selectURI(keyUri);

    if (keyUriEntity) {
      const account =
        await repository.selectRemoteAccountByKeyUri(keyUriEntity);

      if (account) {
        return account.select('person');
      }

      throw new Error;
    }

    const key = new ParsedActivityStreams(repository, keyUri, AnyHost);
    const owner = await key.getOwner();
    const ownedKey = await owner.getPublicKey();
    const ownedKeyUri = await ownedKey.getId();

    if (ownedKeyUri != keyUri) {
      throw new Error;
    }

    return this.fromParsedActivityStreams(repository, owner);
  }
};
