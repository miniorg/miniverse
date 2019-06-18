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

import { AbortController } from 'abort-controller';
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

const { signal } = new AbortController;

describe('toActivityStreams', () => {
  test('resolves with its ActivityStreams representation', async () => {
    const recover = jest.fn();
    const like = await fabricateLike({
      object: await fabricateNote(
        { status: { uri: 'https://ReMoTe.xn--kgbechtv/' } })
    });

    await expect(like.toActivityStreams(signal, recover)).resolves.toEqual({
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
        .then(account => account.select('actor', signal, recover))
        .then(unwrap),
      fabricateNote()
    ]);

    const seed = { actor, object };
    const like = await Like.create(repository, seed, signal, recover);

    expect(recover).not.toHaveBeenCalled();
    expect(like.actorId).toBe(actor.id);
    expect(like.objectId).toBe(object.id);

    await expect(repository.selectLikeById(like.id, signal, recover))
      .resolves
      .toHaveProperty('actorId', actor.id);
  });

  test('posts to remote inboxes', async () => {
    const recover = jest.fn();
    const [actor, object] = await Promise.all([
      fabricateLocalAccount()
        .then(account => account.select('actor', signal, recover))
        .then(unwrap),
      fabricateRemoteAccount()
        .then(account => account.select('actor', signal, recover))
        .then(actor => fabricateNote({ status: { actor: unwrap(actor) } }))
    ]);

    await Like.create(repository, { actor, object }, signal, recover);

    await expect((await repository.queue.getWaiting())[0])
      .toHaveProperty(['data', 'type'], 'postLike');
  });
});

describe('createFromParsedActivityStreams', () => {
  test('creates and returns an Announce from an ActivityStreams representation', async () => {
    const recover = jest.fn();
    const [actor, [object, objectUri]] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor', signal, recover))
        .then(unwrap),
      fabricateNote({ status: { uri: null } }).then(note => Promise.all([
        note,
        note.select('status', signal, recover)
          .then(status => unwrap(status).getUri(signal, recover))
      ]))
    ]);

    const like = await Like.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository, { type: 'Like', object: objectUri }, AnyHost),
      actor,
      (new AbortController).signal,
      recover);

    expect(like.actorId).toBe(actor.id);
    expect(like.objectId).toBe(object.id);

    await expect(repository.selectLikeById(like.id, signal, recover))
      .resolves
      .toHaveProperty('actorId', actor.id);

    expect(recover).not.toHaveBeenCalled();
  });

  test('rejects with TypeNotAllowed if type is not Like', async () => {
    const recover = jest.fn();
    const recovery = {};
    const [actor, objectUri] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor', signal, recover)),
      fabricateNote({ status: { uri: null } })
        .then(note => note.select('status', signal, recover))
        .then(status => unwrap(status).getUri(signal, recover))
    ]);

    expect(recover).not.toHaveBeenCalled();
    await expect(Like.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        type: 'https://test.xn--kgbechtv/',
        object: objectUri
      }, AnyHost),
      unwrap(actor),
      (new AbortController).signal,
      error => {
        expect(error[unexpectedType]).toBe(true);
        return recovery;
      })).rejects.toBe(recovery);
  });
});
