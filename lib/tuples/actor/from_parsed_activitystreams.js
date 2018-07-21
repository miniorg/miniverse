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

import { domainToASCII } from 'url';
import { TypeNotAllowed } from '../../parsed_activitystreams';
import RemoteAccount from '../remote_account';
import { lookup } from './resolver';

const actorTypes =
  ['Application', 'Group', 'Organization', 'Person', 'Service'];

export default {
  async createFromHostAndParsedActivityStreams(repository, host, object) {
    const type = await object.getType();
    if (!actorTypes.some(type.has, type)) {
      throw new TypeNotAllowed;
    }

    const asyncPublicKey = object.getPublicKey();
    const [
      id,
      inboxId,
      username,
      name,
      summary,
      publicKeyId,
      publicKeyPem
    ] = await Promise.all([
      object.getId(),
      object.getInbox().then(inbox => inbox.getId()),
      object.getPreferredUsername(),
      object.getName(),
      object.getSummary(),
      asyncPublicKey.then(key => key.getId()),
      asyncPublicKey.then(key => key.getPublicKeyPem()),
      object.getContext().then(context => {
        if (!context.has('https://w3id.org/security/v1')) {
          throw new Error;
        }
      }),
      asyncPublicKey.then(({ normalizedHost }) => {
        if (object.normalizedHost != normalizedHost) {
          throw new Error;
        }
      })
    ]);

    const account = await RemoteAccount.create(
      repository,
      username,
      host,
      name,
      summary,
      id,
      { uri: inboxId },
      { uri: publicKeyId, publicKeyPem });

    return account.select('actor');
  },

  async fromParsedActivityStreams(repository, object) {
    const localUserPrefix = `https://${domainToASCII(repository.host)}/@`;
    const uri = await object.getId();

    if (uri.startsWith(localUserPrefix)) {
      return repository.selectActorByUsernameAndNormalizedHost(
        decodeURIComponent(uri.slice(localUserPrefix.length)), null);
    }

    const uriEntity = await repository.selectAllocatedURI(uri);

    if (uriEntity) {
      const account = await repository.selectRemoteAccountById(uriEntity.id);
      return account.select('actor');
    }

    const { subject } = await lookup(repository, uri);
    const { links } = await lookup(repository, subject);

    if (links.every(({ href, rel }) => href != uri || rel != 'self')) {
      throw new Error;
    }

    const host = subject.split('@', 2)[1];

    return this.createFromHostAndParsedActivityStreams(
      repository, host, object);
  }
};
