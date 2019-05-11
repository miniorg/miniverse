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
import { Create as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams, { TypeNotAllowed } from '../parsed_activitystreams';
import Repository from '../repository';
import Actor from './actor';
import Note from './note';
import Relation, { Reference } from './relation';

interface References {
  object: Note | null;
}

type Properties = { objectId: string } | { objectId?: string; object: Note };

export async function create(repository: Repository, attributedTo: Actor, object: ParsedActivityStreams) {
  const [type] = await Promise.all([
    object.getType(),
    Promise.all([
      object.getAttributedTo().then(actual => actual && actual.getId()),
      attributedTo.getUri()
    ]).then(([actual, expected]) => {
      if (actual && actual != expected) {
        throw new CustomError(
          'attributedTo mismatches. Possibly invalid Activity Streams?',
          'info');
      }
    })
  ]);

  if (type.has('Note')) {
    return Note.fromParsedActivityStreams(repository, object, attributedTo);
  }

  throw new TypeNotAllowed('Unsupported type for creation.', 'info');
}

export default class Create extends Relation<Properties, References> {
  readonly object?: Reference<Note | null>;
  readonly objectId!: string;

  async toActivityStreams(): Promise<ActivityStreams> {
    const object = await this.select('object');
    if (!object) {
      throw new CustomError('object not found', 'error');
    }

    return {
      type: 'Create',
      object: await object.toActivityStreams()
    };
  }

  static async createFromParsedActivityStreams(repository: Repository, activity: ParsedActivityStreams, actor: Actor) {
    const type = await activity.getType();
    if (!type.has('Create')) {
      throw new TypeNotAllowed('Unsupported type. Expected Create.', 'info');
    }

    const objectActivityStreams = await activity.getObject();
    if (!objectActivityStreams) {
      throw new CustomError('object unspecified.', 'error');
    }

    const object = await create(repository, actor, objectActivityStreams);
    if (!object) {
      return null;
    }

    return new this({ repository, object });
  }
}

Create.references = {
  object: { query: Create.withRepository('selectNoteById'), id: 'objectId' }
};
