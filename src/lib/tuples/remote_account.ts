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

import { Account as WebFinger } from '../generated_webfinger';
import Repository from '../repository';
import Relation, { Reference } from './relation';
import Actor from './actor';
import URI, { encodeAcctUserpart } from './uri';
import sanitizeHtml = require('sanitize-html');

interface Inbox {
  readonly uri: string;
}

interface PublicKey {
  readonly uri: string;
  readonly publicKeyDer: Buffer;
}

interface References {
  actor: Actor | null;
  uri: URI | null;
  inboxURI: URI | null;
  publicKeyURI: URI | null;
}

type Properties = { id?: string; publicKeyDer: Buffer } &
({ inboxURIId: string } | { inboxURIId?: string; inboxURI: URI }) &
({ publicKeyURIId: string } | { publicKeyURIId?: string; publicKeyURI: URI });

export default class RemoteAccount extends Relation<Properties, References> {
  id?: string;
  uri?: Reference<URI | null>;
  inboxURI?: Reference<URI | null>;
  inboxURIId?: string;
  publicKeyURI?: Reference<URI | null>;
  publicKeyURIId?: string;
  readonly publicKeyDer!: Buffer;

  async toWebFinger(recover: (error: Error) => unknown): Promise<WebFinger> {
    const actor = await this.select('actor');
    if (!actor) {
      throw recover(new Error('actor not found.'));
    }

    const href = await actor.getUri(recover);
    if (!href) {
      throw recover(new Error('uri not found.'));
    }

    return {
      subject: `acct:${encodeAcctUserpart(actor.username)}@${actor.host}`,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href,
        }
      ]
    };
  }

  static async create(repository: Repository, username: string, host: string, name: string, summary: string, uri: string, inbox: Inbox, publicKey: PublicKey, recover: (error: Error) => unknown) {
    const account = new this({
      repository,
      actor: new Actor({
        repository,
        username,
        host,
        name,
        summary: sanitizeHtml(summary)
      }),
      uri: new URI({ repository, uri, allocated: true }),
      inboxURI: new URI({ repository, uri: inbox.uri, allocated: true }),
      publicKeyURI: new URI({
        repository,
        uri: publicKey.uri,
        allocated: true
      }),
      publicKeyDer: publicKey.publicKeyDer
    });

    const actor = await account.select('actor');
    if (!actor) {
      throw new Error('Actor not found.');
    }

    actor.validate(recover);
    await repository.insertRemoteAccount(account);

    return account;
  }
}

RemoteAccount.references = {
  actor: {
    query: RemoteAccount.withRepository('selectActorById'),
    id: 'id',
    inverseOf: 'account'
  },
  uri: {
    query: RemoteAccount.withRepository('selectURIById'),
    id: 'id'
  },
  inboxURI: {
    query: RemoteAccount.withRepository('selectURIById'),
    id: 'inboxURIId'
  },
  publicKeyURI: {
    query: RemoteAccount.withRepository('selectURIById'),
    id: 'publicKeyURIId'
  }
};
