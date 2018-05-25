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

import ParsedActivityStreams, { AnyHost } from './parsed_activitystreams';
import Follow from './follow';
import Note from './note';
import LocalPerson from './local_person';
import Person from './person';
import repository from './test_repository';

describe('toActivityStreams', () =>
  test('returns ActivityStreams representation', () => {
    const note = new Note(repository, null, {
      attributedTo: new Person(repository, null),
      content: '内容'
    });

    return expect(note.toActivityStreams()).resolves.toEqual({
      type: 'Note',
      content: '内容'
    });
  }));

describe('create', () => test('creates and returns a note', async () => {
  const actor = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: 'follower',
    host: null
  });

  const object = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: 'attributed to',
    host: null
  });

  await Promise.all([
    repository.insertLocalPerson(actor),
    repository.insertLocalPerson(object)
  ]);

  const follow = new Follow(repository, null, { actor, object });
  await repository.insertFollow(follow);

  const note = await Note.create(repository, null, object, '内容');
  const properties = await note.get();

  expect(note).toBeInstanceOf(Note);
  expect(properties).toHaveProperty('uri', null);
  expect(properties).toHaveProperty('attributedTo', object);
  expect(properties).toHaveProperty('content', '内容');
  await expect((await repository.selectRecentNotesByUsernameAndNormalizedHost('attributed to', null))[0].get())
    .resolves
    .toHaveProperty('content', '内容');
  await expect((await repository.selectRecentNotesFromInbox(actor))[0].get())
    .resolves
    .toHaveProperty('content', '内容');
  await expect((await repository.selectRecentNotesFromInbox(object))[0].get())
    .resolves
    .toHaveProperty('content', '内容');
}));

describe('fromParsedActivityStreams', () => test('creates and returns note from ActivityStreams representation', async () => {
  const actor = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: '行動者',
    host: null
  });

  const object = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username: '被行動者',
    host: null
  });

  await Promise.all([
    repository.insertLocalPerson(actor),
    repository.insertLocalPerson(object)
  ]);

  const follow = new Follow(repository, null, { actor, object });
  await repository.insertFollow(follow);

  const subscribedChannel = repository.getInboxChannel(actor);
  let resolveStream;
  const asyncStream = new Promise(resolve => resolveStream = resolve);

  await repository.subscribe(subscribedChannel, (publishedChannel, message) => {
    const parsed = JSON.parse(message);

    expect(publishedChannel).toBe(subscribedChannel);
    expect(parsed).toHaveProperty('type', 'Note');
    expect(parsed).toHaveProperty('content', '内容');

    resolveStream();
  });

  const note = await Note.fromParsedActivityStreams(
    repository,
    object,
    new ParsedActivityStreams(
      repository,
      { type: 'Note', content: '内容' },
      AnyHost));

  const properties = await note.get();

  expect(note).toBeInstanceOf(Note);
  expect(properties).toHaveProperty('attributedTo', object);
  expect(properties).toHaveProperty('content', '内容');
  expect((await repository.selectRecentNotesByUsernameAndNormalizedHost('被行動者', null))[0])
    .toHaveProperty('id', note.id);

  await asyncStream;
}));
