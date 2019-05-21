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

import { Announce as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams from '../parsed_activitystreams';
import Repository from '../repository';
import { postStatus, temporaryError } from '../transfer';
import Actor from './actor';
import Note from './note';
import Relation, { Reference } from './relation';
import Status from './status';
import URI from './uri';

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

type Properties = { id?: string } & (ObjectIdProperyties | ObjectProperties);

export const unexpectedType = Symbol();

export default class Announce extends Relation<Properties, References> {
  id?: string;
  readonly object?: Reference<Note | null>;
  readonly objectId!: string;
  readonly status?: Reference<Status | null>;

  async toActivityStreams(recover: (error: Error) => unknown): Promise<ActivityStreams> {
    const [[id, published], object] = await Promise.all([
      this.select('status').then(status => {
        if (!status) {
          throw recover(new Error('status not found.'));
        }

        return Promise.all([status.getUri(recover), status.published]);
      }),
      this.select('object').then(async object => {
        if (!object) {
          throw recover(new Error('object not found.'));
        }

        const status = await object.select('status');
        if (!status) {
          throw recover(new Error('object\'s status not found.'));
        }

        return status.getUri(recover);
      }),
    ]);

    return { type: 'Announce', id, published, object };
  }

  static async create(repository: Repository, published: Date, actor: Actor, object: Note, uri: null | string, recover: (error: Error) => unknown) {
    const announce = new this({
      repository,
      status: new Status({
        repository,
        published,
        actor,
        uri: uri == null ? null : new URI({ repository, uri, allocated: true })
      }),
      object
    });

    await repository.insertAnnounce(announce);

    const status = await announce.select('status');
    if (!status) {
      throw new Error('status propagation failed.');
    }

    await postStatus(repository, status, recover);

    return announce;
  }

  static async createFromParsedActivityStreams(repository: Repository, object: ParsedActivityStreams, actor: Actor, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const type = await object.getType(recover);

    if (!type.has('Announce')) {
      throw recover(Object.assign(new Error('Unsupported type. Expected Announce.'), { [unexpectedType]: true }));
    }

    const [published, uri, objectObject, objectTo] = await Promise.all([
      object.getPublished(recover),
      object.getId(recover),
      object.getObject(recover).then(async parsed => {
        if (!parsed) {
          throw recover(new Error('object unspecified.'));
        }

        return Note.fromParsedActivityStreams(repository, parsed, null, recover);
      }),
      object.getTo(recover).then(elements => {
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

    return this.create(
      repository,
      published,
      actor,
      objectObject,
      typeof uri == 'string' ? uri : null,
      recover);
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
