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

import { Custom as CustomError } from '../errors';
import { Announce as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams, { TypeNotAllowed } from '../parsed_activitystreams';
import Repository from '../repository';
import { postStatus } from '../transfer';
import Actor from './actor';
import Note from './note';
import Relation, { Reference } from './relation';
import Status from './status';
import URI from './uri';

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

export default class Announce extends Relation<Properties, References> {
  id?: string;
  readonly object?: Reference<Note | null>;
  readonly objectId!: string;
  readonly status?: Reference<Status | null>;

  async toActivityStreams(): Promise<ActivityStreams> {
    const [[id, published], object] = await Promise.all([
      this.select('status').then(status => {
        if (!status) {
          throw new CustomError('status not found', 'error');
        }

        return Promise.all([status.getUri(), status.published]);
      }),
      this.select('object').then(async object => {
        if (!object) {
          throw new CustomError('object not found', 'error');
        }

        const status = await object.select('status');
        if (!status) {
          throw new CustomError('status not found', 'error');
        }

        return status.getUri();
      }),
    ]);

    return { type: 'Announce', id, published, object };
  }

  static async create(repository: Repository, published: Date, actor: Actor, object: Note, uri?: string) {
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
      throw new CustomError('status not found', 'error');
    }

    await postStatus(repository, status);

    return announce;
  }

  static async createFromParsedActivityStreams(repository: Repository, object: ParsedActivityStreams, actor: Actor) {
    const type = await object.getType();

    if (!type.has('Announce')) {
      throw new TypeNotAllowed('Unsupported type. Expected Announce.', 'info');
    }

    const [published, uri, objectObject, objectTo] = await Promise.all([
      object.getPublished(),
      object.getId(),
      object.getObject().then(async parsed => {
        if (!parsed) {
          throw new CustomError('object unspecified.', 'error');
        }

        return Note.fromParsedActivityStreams(repository, parsed);
      }),
      object.getTo().then(elements => {
        if (!elements) {
          throw new CustomError('to unspecified.', 'error');
        }

        return Promise.all(elements
          .filter(Boolean as unknown as <T>(value: T | null) => value is T)
          .map(element => element.getId()));
      })
    ]);

    if (!published) {
      throw new CustomError('published unspecified.', 'error');
    }

    if (!objectTo.includes('https://www.w3.org/ns/activitystreams#Public') || !objectObject) {
      return null;
    }

    return this.create(
      repository,
      published,
      actor,
      objectObject,
      typeof uri == 'string' ? uri : undefined);
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
