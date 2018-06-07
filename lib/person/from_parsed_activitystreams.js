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
import RemoteAccount from '../remote_account';
import { lookup } from './resolver';

export default {
  async fromHostAndParsedActivityStreams(repository, host, object) {
    const asyncPublicKey = object.getPublicKey();
    const [
      id,
      inboxId,
      username,
      publicKeyId,
      publicKeyPem
    ] = await Promise.all([
      object.getId(),
      object.getInbox().then(inbox => inbox.getId()),
      object.getPreferredUsername(),
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

    const { person } = await RemoteAccount.create(
      repository,
      username,
      host,
      id,
      { uri: inboxId },
      { uri: publicKeyId, publicKeyPem });

    return person;
  },

  async fromParsedActivityStreams(repository, object) {
    const localUserPrefix = `https://${domainToASCII(repository.host)}/@`;
    const uri = await object.getId();

    if (uri.startsWith(localUserPrefix)) {
      const account = await repository.selectLocalAccountByUsername(
        decodeURIComponent(uri.slice(localUserPrefix.length)));

      return account && account.select('person');
    }

    const uriEntity = await repository.selectURI(uri);

    if (uriEntity) {
      const account = await repository.selectRemoteAccountById(uriEntity.id);
      return account.select('person');
    }

    const { object: { subject } } = await lookup(uri);
    const normalizedSubject = subject.replace(/^acct:/, '');
    const { object: { links } } = await lookup(normalizedSubject);

    if (links.every(({ href, rel }) => href != uri || rel != 'self')) {
      throw new Error;
    }

    const host = subject.split('@', 2)[1];

    return this.fromHostAndParsedActivityStreams(repository, host, object);
  }
};
