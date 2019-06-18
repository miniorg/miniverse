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

import { AbortController, AbortSignal } from 'abort-controller';
import { Announce as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams from '../parsed_activitystreams';
import Repository from '../repository';
import { postStatus, temporaryError } from '../transfer';
import Actor from './actor';
import Note from './note';
import Relation, { Reference } from './relation';
import Status from './status';

const idMissing = {};

interface ObjectIdProperyties {
  objectId: string;
}

interface ObjectProperties {
  objectId?: string;
  object: Note;
}

interface References {
  status: Status | null;
  object: Note | null;
}

type Properties = ({ id: string } | { id?: string; status: Status }) &
(ObjectIdProperyties | ObjectProperties);

export const unexpectedType = Symbol();

export interface Seed {
  readonly status: {
    readonly published: Date;
    readonly actor: Actor;
    readonly uri: null | string;
  };
  readonly object: Note;
}

export default class Announce extends Relation<Properties, References> {
  readonly id!: string;
  readonly object?: Reference<Note | null>;
  readonly objectId!: string;
  readonly status?: Reference<Status | null>;

  async toActivityStreams(
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ): Promise<ActivityStreams> {
    const [[id, published], object] = await Promise.all([
      this.select('status', signal, recover).then(status => {
        if (!status) {
          throw recover(new Error('status not found.'));
        }

        return Promise.all([
          status.getUri(signal, recover),
          status.published
        ]);
      }),
      this.select('object', signal, recover).then(async object => {
        if (!object) {
          throw recover(new Error('object not found.'));
        }

        const status = await object.select('status', signal, recover);
        if (!status) {
          throw recover(new Error('object\'s status not found.'));
        }

        return status.getUri(signal, recover);
      }),
    ]);

    return { type: 'Announce', id, published, object };
  }

  static async create(
    repository: Repository,
    seed: Seed,
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ) {
    const announce = await repository.insertAnnounce(seed, signal, recover);
    const status = await announce.select('status', signal, recover);
    if (!status) {
      throw new Error('status propagation failed.');
    }

    await postStatus(repository, status, (new AbortController).signal, recover);

    return announce;
  }

  static async createFromParsedActivityStreams(
    repository: Repository,
    object: ParsedActivityStreams,
    actor: Actor,
    signal: AbortSignal,
    recover: (error: Error & {
      name?: string;
      [temporaryError]?: boolean;
      [unexpectedType]?: boolean;
    }) => unknown
  ) {
    const type = await object.getType(signal, recover);

    if (!type.has('Announce')) {
      throw recover(Object.assign(new Error('Unsupported type. Expected Announce.'), { [unexpectedType]: true }));
    }

    const [published, uri, objectObject, objectTo] = await Promise.all([
      object.getPublished(signal, recover),
      object.getId(recover),
      object.getObject(signal, recover).then(async parsed => {
        if (!parsed) {
          throw recover(new Error('object unspecified.'));
        }

        return Note.fromParsedActivityStreams(repository, parsed, null, signal, recover);
      }),
      object.getTo(signal, recover).then(elements => {
        if (!elements) {
          throw recover(new Error('to unspecified.'));
        }

        return Promise.all(elements.map(element => {
          if (element) {
            return element.getId(() => idMissing).catch(error => {
              if (error != idMissing) {
                throw error;
              }
            });
          }
        }));
      })
    ]);

    if (!published) {
      throw recover(new Error('published unspecified.'));
    }

    if (!objectTo.includes('https://www.w3.org/ns/activitystreams#Public') || !objectObject) {
      return null;
    }

    return this.create(repository, {
      status: {
        published,
        actor,
        uri: typeof uri == 'string' ? uri : null
      },
      object: objectObject
    }, signal, recover);
  }
}

Announce.references = {
  status: {
    query: Announce.withRepository('selectStatusById'),
    id: 'id',
    inverseOf: 'extension'
  },
  object: { query: Announce.withRepository('selectNoteById'), id: 'objectId' }
};
