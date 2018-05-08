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
import LocalAccount from './local_account';
import Person from './person';
import repository from './test_repository';

describe('toActivityStreams', () =>
  test('returns ActivityStreams representation', () => {
    const note = new Note({
      attributedTo: new Person,
      content: '内容'
    });

    expect(note.toActivityStreams()).toEqual({
      type: 'Note',
      content: '内容'
    });
  }));

describe('create', () => test('creates and returns a note', async () => {
  const attributedTo = new Person({
    account: new LocalAccount({
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username: '',
    host: null
  });

  await repository.insertLocalAccount(attributedTo.account);
  const note = await Note.create(repository, attributedTo, '内容');

  expect(note).toBeInstanceOf(Note);
  expect(note).toHaveProperty('attributedTo', attributedTo);
  expect(note).toHaveProperty('content', '内容');
  expect((await repository.selectRecentNotesByUsernameAndNormalizedHost('', null))[0])
    .toHaveProperty('content', '内容');
}));

describe('fromParsedActivityStreams', () => test('creates and returns note from ActivityStreams representation', async () => {
  const follow = new Follow({
    actor: new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '行動者',
      host: null
    }),
    object: new Person({
      account: new LocalAccount({
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '被行動者',
      host: null
    })
  });

  await Promise.all([
    repository.insertLocalAccount(follow.actor.account),
    repository.insertLocalAccount(follow.object.account)
  ]);

  await repository.insertFollow(follow);

  const subscribedChannel = repository.getInboxChannel(follow.actor.account);
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
    follow.object,
    new ParsedActivityStreams({ type: 'Note', content: '内容' }, AnyHost));

  expect(note).toBeInstanceOf(Note);
  expect(note).toHaveProperty('attributedTo', follow.object);
  expect(note).toHaveProperty('content', '内容');
  expect((await repository.selectRecentNotesByUsernameAndNormalizedHost('被行動者', null))[0])
    .toHaveProperty('content', '内容');

  await asyncStream;
}));
