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

import Like from './like';
import ParsedActivityStreams, {
  AnyHost,
  TypeNotAllowed
} from './parsed_activitystreams';
import {
  fabricateLike,
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from './test/fabricator';
import repository from './test/repository';

describe('toActivityStreams', () =>
  test('resolves with its ActivityStreams representation', async () => {
    const like = await fabricateLike({
      object: await fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/' } } })
    });

    await expect(like.toActivityStreams()).resolves.toEqual({
      type: 'Like',
      object: 'https://ReMoTe.xn--kgbechtv/'
    });
  }));

describe('create', () => {
  test('inserts and returns a new Announce', async () => {
    const [{ person }, object] =
      await Promise.all([fabricateLocalAccount(), fabricateNote()]);

    const like = await Like.create(repository, person, object);

    expect(like.repository).toBe(repository);
    expect(like.actorId).toBe(person.id);
    expect(like.objectId).toBe(object.id);

    await expect(repository.selectLikeById(like.id))
      .resolves
      .toHaveProperty('actorId', person.id);
  });

  test('posts to remote inboxes', async () => {
    const [{ person }, object] = await Promise.all([
      fabricateLocalAccount(),
      fabricateRemoteAccount().then(({ person }) =>
        fabricateNote({ status: { person } }))
    ]);

    await Like.create(repository, person, object);

    await expect((await repository.queue.getWaiting())[0])
      .toHaveProperty(['data', 'type'], 'postLike');
  });
});

describe('createFromParsedActivityStreams', () => {
  test('creates and returns an Announce from an ActivityStreams representation', async () => {
    const [{ person }, [object, objectUri]] = await Promise.all([
      fabricateRemoteAccount(),
      fabricateNote({ status: { uri: null } })
        .then(note => Promise.all([note, note.status.getUri()]))
    ]);

    const like = await Like.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository, { type: 'Like', object: objectUri }, AnyHost),
      person);

    expect(like.repository).toBe(repository);
    expect(like.actorId).toBe(person.id);
    expect(like.objectId).toBe(object.id);

    await expect(repository.selectLikeById(like.id))
      .resolves
      .toHaveProperty('actorId', person.id);
  });

  test('rejects with TypeNotAllowed if type is not Like', async () => {
    const [{ person }, objectUri] = await Promise.all([
      fabricateRemoteAccount(),
      fabricateNote({ status: { uri: null } })
        .then(note => note.status.getUri())
    ]);

    await expect(Like.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        type: 'https://test.xn--kgbechtv/',
        object: objectUri
      }, AnyHost),
      person)).rejects.toBeInstanceOf(TypeNotAllowed);
  });
});
