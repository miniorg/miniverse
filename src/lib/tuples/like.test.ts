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

import ParsedActivityStreams, { AnyHost } from '../parsed_activitystreams';
import {
  fabricateLike,
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Like, { unexpectedType } from './like';

describe('toActivityStreams', () => {
  test('resolves with its ActivityStreams representation', async () => {
    const recover = jest.fn();
    const like = await fabricateLike({
      object: await fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/' } } })
    });

    await expect(like.toActivityStreams(recover)).resolves.toEqual({
      type: 'Like',
      object: 'https://ReMoTe.xn--kgbechtv/'
    });

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('create', () => {
  test('inserts and returns a new Announce', async () => {
    const recover = jest.fn();
    const [actor, object] = await Promise.all([
      fabricateLocalAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateNote()
    ]);

    const like = await Like.create(repository, actor, object, recover);

    expect(recover).not.toHaveBeenCalled();
    expect(like.actorId).toBe(actor.id);
    expect(like.objectId).toBe(object.id);

    await expect(repository.selectLikeById(unwrap(like.id)))
      .resolves
      .toHaveProperty('actorId', actor.id);
  });

  test('posts to remote inboxes', async () => {
    const recover = jest.fn();
    const [actor, object] = await Promise.all([
      fabricateLocalAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateRemoteAccount()
        .then(account => account.select('actor'))
        .then(actor => fabricateNote({ status: { actor: unwrap(actor) } }))
    ]);

    await Like.create(repository, actor, object, recover);

    await expect((await repository.queue.getWaiting())[0])
      .toHaveProperty(['data', 'type'], 'postLike');
  });
});

describe('createFromParsedActivityStreams', () => {
  test('creates and returns an Announce from an ActivityStreams representation', async () => {
    const recover = jest.fn();
    const [actor, [object, objectUri]] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateNote({ status: { uri: null } }).then(note => Promise.all([
        note,
        note.select('status').then(status => unwrap(status).getUri(recover))
      ]))
    ]);

    const like = await Like.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository, { type: 'Like', object: objectUri }, AnyHost),
      actor,
      recover);

    expect(recover).not.toHaveBeenCalled();
    expect(like.actorId).toBe(actor.id);
    expect(like.objectId).toBe(object.id);

    await expect(repository.selectLikeById(unwrap(like.id)))
      .resolves
      .toHaveProperty('actorId', actor.id);
  });

  test('rejects with TypeNotAllowed if type is not Like', async () => {
    const recover = jest.fn();
    const recovery = {};
    const [actor, objectUri] = await Promise.all([
      fabricateRemoteAccount().then(account => account.select('actor')),
      fabricateNote({ status: { uri: null } })
        .then(note => note.select('status'))
        .then(status => unwrap(status).getUri(recover))
    ]);

    expect(recover).not.toHaveBeenCalled();
    await expect(Like.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        type: 'https://test.xn--kgbechtv/',
        object: objectUri
      }, AnyHost),
      unwrap(actor),
      error => {
        expect(error[unexpectedType]).toBe(true);
        return recovery;
      })).rejects.toBe(recovery);
  });
});
