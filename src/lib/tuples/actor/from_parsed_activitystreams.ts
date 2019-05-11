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
import { Custom as CustomError } from '../../errors';
import ParsedActivityStreams, { TypeNotAllowed } from '../../parsed_activitystreams';
import Repository from '../../repository';
import RemoteAccount from '../remote_account';
import Base from './base';
import { lookup } from './resolver';
import { createPublicKey } from 'crypto';

const actorTypes =
  ['Application', 'Group', 'Organization', 'Person', 'Service'];

export default class extends Base {
  static async createFromHostAndParsedActivityStreams(repository: Repository, host: string, object: ParsedActivityStreams) {
    const type = await object.getType();
    if (!actorTypes.some(type.has, type)) {
      throw new TypeNotAllowed('Unsupported actor type.', 'info');
    }

    const [
      id,
      inboxId,
      username,
      name,
      summary,
      [publicKeyId, publicKeyPem]
    ] = await Promise.all([
      object.getId(),
      object.getInbox().then(inbox => {
        if (!inbox) {
          throw new CustomError('Inbox unspecified.', 'error');
        }

        return inbox.getId();
      }),
      object.getPreferredUsername(),
      object.getName(),
      object.getSummary(),
      object.getPublicKey().then(key => {
        if (!key) {
          throw new CustomError('Key unspecified.', 'error');
        }

        if (object.normalizedHost != key.normalizedHost) {
          throw new CustomError(
            'Actor host and publicKey host mismatches. Possibly invalid Activity Streams?',
            'info');
        }

        return Promise.all([key.getId(), key.getPublicKeyPem()]);
      }),
      object.getContext().then(context => {
        if (!context.has('https://w3id.org/security/v1')) {
          throw new CustomError(
            'Security context not found. Possibly unsupported Activity Streams?',
            'info');
        }
      })
    ]);

    if (typeof publicKeyPem != 'string') {
      throw new CustomError('Invalid publicKeyPem.', 'error');
    }

    if (typeof username != 'string') {
      throw new CustomError('Invalid username', 'error');
    }

    if (typeof name != 'string') {
      throw new CustomError('Invalid name', 'error');
    }

    if (typeof summary != 'string') {
      throw new CustomError('Invalid summary', 'error');
    }

    if (typeof id != 'string') {
      throw new CustomError('Invalid id.', 'error');
    }

    if (typeof inboxId != 'string') {
      throw new CustomError('Invalid inbox id.', 'error');
    }

    if (typeof publicKeyId != 'string') {
      throw new CustomError('Invalid key Id', 'error');
    }

    const publicKeyDer = createPublicKey(publicKeyPem)
      .export({ format: 'der', type: 'pkcs1' });

    const account = await RemoteAccount.create(
      repository,
      username,
      host,
      name,
      summary,
      id,
      { uri: inboxId },
      { uri: publicKeyId, publicKeyDer });

    return account.select('actor');
  }

  static async fromParsedActivityStreams(repository: Repository, object: ParsedActivityStreams) {
    const localUserPrefix = `https://${domainToASCII(repository.host)}/@`;
    const uri = await object.getId();

    if (typeof uri != 'string') {
      throw new CustomError('Invalid id.', 'error');
    }

    if (uri.startsWith(localUserPrefix)) {
      return repository.selectActorByUsernameAndNormalizedHost(
        decodeURIComponent(uri.slice(localUserPrefix.length)), null);
    }

    const uriEntity = await repository.selectAllocatedURI(uri);

    if (uriEntity) {
      if (!uriEntity.id) {
        throw new CustomError('The internal id cannot be resolved.', 'error');
      }

      const account = await repository.selectRemoteAccountById(uriEntity.id);
      if (!account) {
        throw new CustomError('Account not found.', 'error');
      }

      return account.select('actor');
    }

    const { subject } = await lookup(repository, uri);
    if (typeof subject != 'string') {
      throw new CustomError('Invalid WebFinger subject.', 'error');
    }

    const { links } = await lookup(repository, subject);
    if (!Array.isArray(links)) {
      throw new CustomError('Invalid links.', 'error');
    }

    if (links.every(({ href, rel }) => href != uri || rel != 'self')) {
      throw new CustomError(
        'WebFinger does not return self representation. Possibly unsupported WebFinger?',
        'info');
    }

    const host = subject.split('@', 2)[1];

    return this.createFromHostAndParsedActivityStreams(
      repository, host, object);
  }
}
