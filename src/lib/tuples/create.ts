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
import { Create as ActivityStreams } from '../generated_activitystreams';
import ParsedActivityStreams from '../parsed_activitystreams';
import Repository from '../repository';
import { temporaryError } from '../transfer';
import Actor from './actor';
import Document from './document';
import Note from './note';
import Relation, { Reference } from './relation';

interface References {
  object: Document | Note | null;
}

type Properties = { objectId: string } | { objectId?: string; object: Document | Note };

export const unexpectedObjectType = Symbol();
export const unexpectedType = Symbol();

export async function create(
  repository: Repository,
  attributedTo: Actor,
  object: ParsedActivityStreams,
  signal: AbortSignal,
  recover: (error: Error) => unknown
) {
  const [actual, expected] = await Promise.all([
    object.getAttributedTo(signal, recover)
      .then(actual => actual && actual.getId(recover)),
    attributedTo.getUri(signal, recover)
  ]);

  if (actual && actual != expected) {
    throw recover(new Error('attributedTo verification failed.'));
  }

  return Note.fromParsedActivityStreams(repository, object, attributedTo, signal, recover);
}

export default class Create extends Relation<Properties, References> {
  readonly object?: Reference<Document | Note | null>;
  readonly objectId!: string;

  async getId(
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ) {
    const object = await this.select('object', signal, recover);
    if (!(object instanceof Document)) {
      throw recover(new Error('Unexpected object type. Expected Document.'));
    }

    return `https://${domainToASCII(this.repository.host)}/${object.id}`;
  }

  async toActivityStreams(
    signal: AbortSignal,
    recover: (error: Error & { name?: string }) => unknown
  ): Promise<ActivityStreams> {
    const object = await this.select('object', signal, recover);
    if (!object) {
      throw recover(new Error('object not found.'));
    }

    if (object instanceof Document) {
      return {
        type: 'Create',
        id: await this.getId(signal, recover),
        object: await object.toActivityStreams()
      };
    }

    return {
      type: 'Create',
      object: await object.toActivityStreams(signal, recover)
    };
  }

  static async createFromParsedActivityStreams(repository: Repository, activity: ParsedActivityStreams, actor: Actor, signal: AbortSignal, recover: (error: Error & {
    [temporaryError]?: boolean;
    [unexpectedType]?: boolean;
  }) => unknown) {
    const type = await activity.getType(signal, recover);
    if (!type.has('Create')) {
      throw recover(Object.assign(new Error('Unsupported type. Expected Create.'), { [unexpectedType]: true }));
    }

    const objectActivityStreams = await activity.getObject(signal, recover);
    if (!objectActivityStreams) {
      throw recover(new Error('object unspecified.'));
    }

    const object = await create(repository, actor, objectActivityStreams, signal, recover);
    if (!object) {
      return null;
    }

    return new this({ repository, object });
  }
}

Create.references = {
  object: { query: Create.withRepository('selectNoteById'), id: 'objectId' }
};
