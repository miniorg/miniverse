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
import { domainToASCII, domainToUnicode } from 'url';
import {
  Actor as ActivityStreams,
  LocalActor as LocalActivityStreams
} from '../../generated_activitystreams';
import { temporaryError } from '../../transfer';
import Key from '../key';
import LocalAccount from '../local_account';
import Relation, { Reference } from '../relation';
import RemoteAccount from '../remote_account';
import Status from '../status';
import { encodeSegment } from '../uri';
import ParsedActivityStreams from '../../parsed_activitystreams';
import Repository from '../../repository';
import FromParsedActivityStreams from './from_parsed_activitystreams';
import Resolver from './resolver';

export const unexpectedType = Symbol();

interface Properties {
  id?: string;
  username: string;
  host: string | null;
  name: string;
  summary: string;
}

interface References {
  account: LocalAccount | RemoteAccount | null;
  followers: Base[];
  statuses: Status[];
}

export default class Base extends Relation<Properties, References>
  implements FromParsedActivityStreams, Resolver {
  id?: string;
  readonly username!: string;
  readonly host!: string | null;
  readonly name!: string;
  readonly summary!: string;
  readonly account?: Reference<LocalAccount | RemoteAccount | null>;
  readonly followers?: Reference<this[]>;
  readonly statuses?: Reference<Status[]>;

  validate(recover: (error: Error) => unknown) {
    if (!/^[\w-.~!$&'()*+,;=].*$/.test(this.username)) {
      throw recover(new Error('Invalid username.'));
    }
  }

  async getUri(recover: (error: Error) => unknown) {
    if (this.host) {
      const account = await this.select('account');
      if (!account) {
        throw recover(new Error('account not found.'));
      }

      if (!(account instanceof RemoteAccount)) {
        throw new Error('Invalid account.');
      }

      const uri = await account.select('uri');
      return uri && uri.uri;
    }

    const host = domainToASCII(this.repository.host);
    const username = encodeSegment(this.username);

    return `https://${host}/@${username}`;
  }

  async toActivityStreams(recover: (error: Error) => unknown): Promise<ActivityStreams | LocalActivityStreams> {
    const asciiHost = domainToASCII(this.repository.host);

    if (this.host) {
      const acct = `${this.username}@${domainToUnicode(this.host)}`;
      const proxyBase = `https://${asciiHost}/@${encodeSegment(acct)}`;
      const id = await this.getUri(recover);

      if (!id) {
        throw recover(new Error('id unresolved.'));
      }

      return {
        id,
        preferredUsername: this.username,
        name: this.name,
        summary: this.summary,
        inbox: proxyBase + '/inbox',
        outbox: proxyBase + '/outbox'
      };
    }

    const key = new Key({ owner: this, repository: this.repository });

    const [id, publicKey, account] = await Promise.all([
      this.getUri(recover),
      key.toActivityStreams(recover),
      this.select('account')
    ]);

    if (!account) {
      throw recover(new Error('account not found'));
    }

    if (!(account instanceof LocalAccount)) {
      throw new Error('Invalid account.');
    }

    if (!id) {
      throw recover(new Error('id unresolved.'));
    }

    return {
      id,
      type: 'Person',
      preferredUsername: this.username,
      name: this.name,
      summary: this.summary,
      inbox: id + '/inbox',
      outbox: id + '/outbox',
      endpoints: { proxyUrl: `https://${asciiHost}/api/proxy` },
      publicKey,
      'miniverse:salt': account.salt.toString('base64')
    };
  }

  static readonly createFromHostAndParsedActivityStreams:
  (repository: Repository, host: string, object: ParsedActivityStreams, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) => Promise<Base | null>;
  static readonly fromParsedActivityStreams:
  (repository: Repository, object: ParsedActivityStreams, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) => Promise<Base | null>;
  static readonly fromUsernameAndNormalizedHost:
  (repository: Repository, username: string, normalizedHost: string | null, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) => Promise<Base | null>;
  static readonly fromKeyUri:
  (repository: Repository, keyUri: string, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) => Promise<Base | null>;

  static references = {
    account: {
      query({ repository, id, host }: Base) {
        if (id == null) {
          throw new Error('Invalid id.');
        }
  
        return host ?
          repository.selectRemoteAccountById(id) :
          repository.selectLocalAccountById(id);
      },
      id: 'id',
      inverseOf: 'actor'
    },
    followers: { query: Base.withRepository('selectActorsByFolloweeId'), id: 'id' },
    statuses: {
      query: Base.withRepository('selectRecentStatusesIncludingExtensionsByActorId'),
      id: 'id',
      inverseOf: 'actor'
    }
  };
}