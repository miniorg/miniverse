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

import { AbortSignal } from 'abort-controller';
import { domainToASCII } from 'url';
import ParsedActivityStreams from '../../parsed_activitystreams';
import Repository, { conflict } from '../../repository';
import RemoteAccount from '../remote_account';
import { temporaryError } from '../../transfer';
import Base, { unexpectedType } from './base';
import { lookup } from './resolver';
import { createPublicKey } from 'crypto';

const actorTypes =
  ['Application', 'Group', 'Organization', 'Person', 'Service'];

export default class extends Base {
  static async createFromHostAndParsedActivityStreams(repository: Repository, host: string, object: ParsedActivityStreams, signal: AbortSignal, recover: (error: Error & {
    [conflict]?: boolean;
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const type = await object.getType(signal, recover);
    if (!actorTypes.some(type.has, type)) {
      throw recover(Object.assign(new Error('Unsupported type. Expected Application, Group, Organization, Person or Service.'), { [unexpectedType]: true }));
    }

    const [
      id,
      inboxId,
      username,
      name,
      summary,
      [publicKeyId, publicKeyPem]
    ] = await Promise.all([
      object.getId(recover),
      object.getInbox(signal, recover).then(inbox => {
        if (!inbox) {
          throw recover(new Error('inbox unspecified.'));
        }

        return inbox.getId(recover);
      }),
      object.getPreferredUsername(signal, recover),
      object.getName(signal, recover),
      object.getSummary(signal, recover),
      object.getPublicKey(signal, recover).then(key => {
        if (!key) {
          throw recover(new Error('key unspecified.'));
        }

        if (object.normalizedHost != key.normalizedHost) {
          throw recover(new Error('Key host mismatches.'));
        }

        return Promise.all([
          key.getId(recover),
          key.getPublicKeyPem(signal, recover)
        ]);
      }),
      object.getContext(signal, recover).then(context => {
        if (!context.has('https://w3id.org/security/v1')) {
          throw recover(new Error('Security context unspecified.'));
        }
      })
    ]);

    if (typeof publicKeyPem != 'string') {
      throw recover(new Error('Unsupported publicKeyPem type.'));
    }

    if (typeof username != 'string') {
      throw recover(new Error('Unsupported username type.'));
    }

    if (typeof name != 'string') {
      throw recover(new Error('Unsupported name type.'));
    }

    if (typeof summary != 'string') {
      throw recover(new Error('Unsupported summary type.'));
    }

    if (typeof id != 'string') {
      throw recover(new Error('Unsupported id type.'));
    }

    if (typeof inboxId != 'string') {
      throw recover(new Error('Unsupported inbox\'s id type.'));
    }

    if (typeof publicKeyId != 'string') {
      throw recover(new Error('Unsupported publicKey\'s id type.'));
    }

    const publicKeyDer = createPublicKey(publicKeyPem)
      .export({ format: 'der', type: 'pkcs1' });

    const account = await RemoteAccount.create(repository, {
      actor: {
        username,
        host,
        name,
        summary
      },
      uri: id,
      inbox: { uri: inboxId },
      publicKey: { uri: publicKeyId, publicKeyDer }
    }, recover);

    return account.select('actor');
  }

  static async fromParsedActivityStreams(repository: Repository, object: ParsedActivityStreams, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const localUserPrefix = `https://${domainToASCII(repository.host)}/@`;
    const uri = await object.getId(recover);

    if (typeof uri != 'string') {
      throw recover(new Error('Unexpected id type'));
    }

    if (uri.startsWith(localUserPrefix)) {
      return repository.selectActorByUsernameAndNormalizedHost(
        decodeURIComponent(uri.slice(localUserPrefix.length)), null);
    }

    const uriEntity = await repository.selectAllocatedURI(uri);

    if (uriEntity) {
      const account = await repository.selectRemoteAccountById(uriEntity.id);
      if (!account) {
        throw recover(new Error('Account not found.'));
      }

      const actor = await account.select('actor');
      if (!actor) {
        throw recover(new Error('actor not found.'));
      }

      return actor;
    }

    const { subject } = await lookup(repository, uri, signal, recover);
    if (typeof subject != 'string') {
      throw recover(new Error('Unsupported WebFinger subject type.'));
    }

    const { links } = await lookup(repository, subject, signal, recover);
    if (!Array.isArray(links)) {
      throw recover(new Error('Unsupported WebFinger links type.'));
    }

    if (links.every(({ href, rel }) => href != uri || rel != 'self')) {
      throw recover(new Error('WebFinger does not contain self.'));
    }

    const host = subject.split('@', 2)[1];
    let conflictError: Error | undefined;

    return this.createFromHostAndParsedActivityStreams(
      repository,
      host,
      object,
      signal,
      error => {
        if (error[conflict]) {
          conflictError = error;
          return error;
        }

        return recover(error);
      }
    ).catch(async error => {
      if (!conflictError) {
        throw error;
      }

      const uriEntity = await repository.selectAllocatedURI(uri);
      if (uriEntity) {
        const account = await repository.selectRemoteAccountById(uriEntity.id);
        if (!account) {
          throw recover(new Error('Account not found.'));
        }
  
        const actor = account.select('actor');
        if (!actor) {
          throw recover(new Error('actor not found.'));
        }
      }

      throw recover(conflictError);
    })
  }
}
