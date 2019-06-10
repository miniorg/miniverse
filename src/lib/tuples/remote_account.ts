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

type Properties = { publicKeyDer: Buffer } &
({ id: string } | { id?: string; actor: Actor }) &
({ inboxURIId: string } | { inboxURIId?: string; inboxURI: URI }) &
({ publicKeyURIId: string } | { publicKeyURIId?: string; publicKeyURI: URI });

export interface Seed {
  readonly actor: {
    readonly username: string;
    readonly host: string;
    readonly name: string;
    readonly summary: string;
  };
  readonly uri: string;
  readonly inbox: Inbox;
  readonly publicKey: PublicKey;
}

export default class RemoteAccount extends Relation<Properties, References> {
  readonly id!: string;
  readonly uri?: Reference<URI | null>;
  readonly inboxURI?: Reference<URI | null>;
  readonly inboxURIId!: string;
  readonly publicKeyURI?: Reference<URI | null>;
  readonly publicKeyURIId!: string;
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

  static async create(
    repository: Repository,
    { actor, uri, inbox, publicKey }: Seed,
    recover: (error: Error) => unknown
  ) {
    Actor.validateUsername(actor.username, recover);

    return repository.insertRemoteAccount({
      actor: {
        username: actor.username,
        host: actor.host,
        name: actor.name,
        summary: sanitizeHtml(actor.summary)
      },
      uri,
      inbox,
      publicKey
    });
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
