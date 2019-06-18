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
import Actor from './actor';
import Announce from './announce';
import Note from './note';
import Relation, { Reference } from './relation';
import URI, { encodeSegment } from './uri';

interface BaseProperties {
  id: string;
  published: Date;
}

interface ActorIdProperties {
  actorId: string;
}

interface ActorProperties {
  actorId?: string;
  actor: Actor;
}

interface References {
  extension: Announce | Note | null;
  actor: Actor | null;
  uri: URI | null;
}

type Properties = BaseProperties & (ActorIdProperties | ActorProperties);

export default class Status extends Relation<Properties, References> {
  readonly id!: string;
  readonly uri?: Reference<URI | null>;
  readonly actorId!: string;
  readonly actor?: Reference<Actor | null>;
  readonly extension?: Reference<Announce | Note | null>;
  readonly published!: Date;

  async getUri(
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ) {
    const actor = await this.select('actor', signal, recover);
    if (!actor) {
      throw recover(new Error('actor not found.'));
    }

    if (actor.host) {
      const uri = await this.select('uri', signal, recover);
      if (!uri) {
        throw recover(new Error('uri not found.'));
      }

      return uri.uri;
    }

    const repositoryHost = domainToASCII(this.repository.host);
    const encodedUsername = encodeSegment(actor.username);

    return `https://${repositoryHost}/@${encodedUsername}/${this.id}`;
  }
}

Status.references = {
  extension: { id: 'id', inverseOf: 'status' },
  actor: { id: 'actorId', query: Status.withRepository('selectActorById') },
  uri: { id: 'id', query: Status.withRepository('selectURIById') }
};
