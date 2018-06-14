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
import LocalAccount from './local_account';
import Note from './note';
import ParsedActivityStreams, { AnyHost } from './parsed_activitystreams';
import Person from './person';
import repository from './test_repository';

async function fabricatePerson(username) {
  const person = new Person({
    repository,
    account: new LocalAccount({
      repository,
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username,
    host: null
  });

  await repository.insertLocalAccount(person.account);

  return person;
}

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

  describe('fromParsedActivityStreams', () =>
    test('creates from parsed ActivityStreams', async () => {
      const activity = new ParsedActivityStreams(repository, {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Create',
        object: {
          type: 'Note',
          to: 'https://www.w3.org/ns/activitystreams#Public',
          content: '',
          tag: []
        }
      }, AnyHost);

      const actor = await fabricatePerson('');
      const note = await Create.fromParsedActivityStreams(
        repository, activity, actor);

      expect(note).toBeInstanceOf(Note);
      expect(note.status.person.id).toBe(actor.id);
      expect(note.content).toBe('');
    }));
});

describe('create', () => {
  test('creates note', async () => {
    const object = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Note',
      to: 'https://www.w3.org/ns/activitystreams#Public',
      content: '',
      tag: []
    }, AnyHost);

    const attributedTo = await fabricatePerson('');
    const note = await create(repository, attributedTo, object);

    expect(note).toBeInstanceOf(Note);
    expect(note.status.person.id).toBe(attributedTo.id);
    expect(note.content).toBe('');
  });

  describe('if attributedTo is specified', () => {
    test('accepts if attributedTo matches', async () => {
      const object = new ParsedActivityStreams(repository, {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Note',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        attributedTo: 'https://xn--kgbechtv/@',
        content: '',
        tag: []
      }, AnyHost);

      const attributedTo = await fabricatePerson('');
      const note = await create(repository, attributedTo, object);

      expect(note).toBeInstanceOf(Note);
      expect(note.status.person.id).toBe(attributedTo.id);
      expect(note.content).toBe('');
    });

    test('does not accept if attributedTo mismatches', async () => {
      const object = new ParsedActivityStreams(repository, {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Note',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        attributedTo: 'https://xn--kgbechtv/@',
        content: '',
        tag: []
      }, AnyHost);

      const [expectedAttributedTo] = await Promise.all([
        fabricatePerson('仮定された行動者'),
        fabricatePerson('')
      ]);

      await expect(create(repository, expectedAttributedTo, object))
        .rejects
        .toBeInstanceOf(Error);
    });
  });
});
