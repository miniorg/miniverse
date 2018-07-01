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

import Create, { create } from './create';
import Note from './note';
import ParsedActivityStreams, {
  AnyHost,
  TypeNotAllowed
} from './parsed_activitystreams';
import { fabricateLocalAccount } from './test/fabricator';
import repository from './test/repository';

describe('Create', () => {
  describe('toActivityStreams', () =>
    test('resolves with ActivityStreams representation', () => {
      const instance = new Create({
        object: {
          toActivityStreams() {
            return { type: 'https://example.com/' };
          }
        }
      });

      return expect(instance.toActivityStreams()).resolves.toEqual({
        type: 'Create',
        object: { type: 'https://example.com/' }
      });
    }));

  describe('createFromParsedActivityStreams', () => {
    test('creates from parsed ActivityStreams', async () => {
      const activity = new ParsedActivityStreams(repository, {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Create',
        object: {
          type: 'Note',
          published: '2000-01-01T00:00:00.000Z',
          to: 'https://www.w3.org/ns/activitystreams#Public',
          content: '',
          tag: []
        }
      }, AnyHost);

      const { actor } = await fabricateLocalAccount();
      const create = await Create.createFromParsedActivityStreams(
        repository, activity, actor);

      expect(create).toBeInstanceOf(Create);
      expect(create.object).toBeInstanceOf(Note);
      expect(create.object.status.actor.id).toBe(actor.id);
      expect(create.object.content).toBe('');
    });

    test('rejects with TypeNotAllowed if type is not Create', async () => {
      const activity = new ParsedActivityStreams(repository, {
        '@context': 'https://www.w3.org/ns/activitystreams',
        object: {
          type: 'Note',
          published: '2000-01-01T00:00:00.000Z',
          to: 'https://www.w3.org/ns/activitystreams#Public',
          content: '',
          tag: []
        }
      }, AnyHost);

      const { actor } = await fabricateLocalAccount();

      await expect(Create.createFromParsedActivityStreams(
        repository, activity, actor)).rejects.toBeInstanceOf(TypeNotAllowed);
    });
  });
});

describe('create', () => {
  test('creates note', async () => {
    const object = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Note',
      published: '2000-01-01T00:00:00.000Z',
      to: 'https://www.w3.org/ns/activitystreams#Public',
      content: '',
      tag: []
    }, AnyHost);

    const { actor } = await fabricateLocalAccount();
    const note = await create(repository, actor, object);

    expect(note).toBeInstanceOf(Note);
    expect(note.status.actor.id).toBe(actor.id);
    expect(note.content).toBe('');
  });

  describe('if attributedTo is specified', () => {
    test('accepts if attributedTo matches', async () => {
      const object = new ParsedActivityStreams(repository, {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Note',
        published: '2000-01-01T00:00:00.000Z',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        attributedTo: 'https://xn--kgbechtv/@',
        content: '',
        tag: []
      }, AnyHost);

      const { actor } =
        await fabricateLocalAccount({ actor: { username: '' } });

      const note = await create(repository, actor, object);

      expect(note).toBeInstanceOf(Note);
      expect(note.status.actor.id).toBe(actor.id);
      expect(note.content).toBe('');
    });

    test('does not accept if attributedTo mismatches', async () => {
      const object = new ParsedActivityStreams(repository, {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Note',
        published: '2000-01-01T00:00:00.000Z',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        attributedTo: 'https://xn--kgbechtv/@',
        content: '',
        tag: []
      }, AnyHost);

      const [expectedAttributedTo] = await Promise.all([
        fabricateLocalAccount({ status: { username: '仮定された行動者' } }),
        fabricateLocalAccount({ status: { username: '' } })
      ]);

      await expect(create(repository, expectedAttributedTo, object))
        .rejects
        .toBeInstanceOf(Error);
    });
  });
});
