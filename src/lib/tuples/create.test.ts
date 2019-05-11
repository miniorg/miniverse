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
import ParsedActivityStreams, {
  AnyHost,
  TypeNotAllowed
} from '../parsed_activitystreams';
import {
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Create, { create } from './create';
import Note from './note';

describe('Create', () => {
  describe('toActivityStreams', () => {
    test('resolves with ActivityStreams representation', async () => {
      const account = await fabricateRemoteAccount({
        uri: { uri: 'https://ReMoTe.xn--kgbechtv/' }
      });

      const object = await fabricateNote({
        status: {
          published: new Date('2000-01-01T00:00:00.000Z'),
          actor: unwrap(await account.select('actor'))
        },
        content: '内容',
        attachments: [],
        hashtags: [],
        mentions: []
      });

      const instance = new Create({ repository, object });

      await expect(instance.toActivityStreams()).resolves.toEqual({
        type: 'Create',
        object: {
          type: 'Note',
          published: new Date('2000-01-01T00:00:00.000Z'),
          attributedTo: 'https://ReMoTe.xn--kgbechtv/',
          id: 'https://xn--kgbechtv/@1@finger.remote.%D8%A5%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1/' + object.id,
          to: 'https://www.w3.org/ns/activitystreams#Public',
          inReplyTo: null,
          summary: null,
          content: '内容',
          attachment: [],
          tag: []
        }
      });
    });
  });

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
          attachment: [],
          tag: []
        }
      }, AnyHost);

      const account = await fabricateLocalAccount();
      const actor = unwrap(await account.select('actor'));
      const create = unwrap(await Create.createFromParsedActivityStreams(
        repository, activity, actor));

      const object = unwrap(await create.select('object'));

      expect(create).toBeInstanceOf(Create);
      expect(object).toBeInstanceOf(Note);
      await expect(object.select('status'))
        .resolves
        .toHaveProperty('actorId', actor.id);
      expect(object.content).toBe('');
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

      const account = await fabricateLocalAccount();
      const actor = unwrap(await account.select('actor'));

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
      attachment: [],
      tag: []
    }, AnyHost);

    const account = await fabricateLocalAccount();
    const actor = unwrap(await account.select('actor'));
    const note = unwrap(await create(repository, actor, object));
    const status = unwrap(await note.select('status'));

    expect(note).toBeInstanceOf(Note);
    expect(status.actorId).toBe(actor.id);
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
        attachment: [],
        tag: []
      }, AnyHost);

      const account = await fabricateLocalAccount({ actor: { username: '' } });
      const actor = unwrap(await account.select('actor'));
      const note = unwrap(await create(repository, actor, object));
      const status = unwrap(await note.select('status'));

      expect(note).toBeInstanceOf(Note);
      expect(status.actorId).toBe(actor.id);
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
        fabricateLocalAccount({ actor: { username: '仮定された行動者' } })
          .then(account => account.select('actor'))
          .then(unwrap),
        fabricateLocalAccount({ actor: { username: '' } })
      ]);

      await expect(create(repository, expectedAttributedTo, object))
        .rejects
        .toBeInstanceOf(CustomError);
    });
  });
});
