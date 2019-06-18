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
import {
  fabricateAccept,
  fabricateFollow,
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Accept from './accept';

const { signal } = new AbortController;

describe('toActivityStreams', () => {
  test('returns ActivityStreams representation', async () => {
    const recover = jest.fn();

    const [actor, object] = await Promise.all([
      fabricateRemoteAccount({ uri: 'https://ReMoTe.xn--kgbechtv/' })
        .then(account => account.select('actor', signal, recover))
        .then(unwrap),
      fabricateLocalAccount({ actor: { username: '被行動者' } })
        .then(account => account.select('actor', signal, recover))
        .then(unwrap)
    ]);

    const accept = await fabricateAccept({
      object: await fabricateFollow({ actor, object })
    });

    await expect(accept.toActivityStreams(signal, recover)).resolves.toEqual({
      type: 'Accept',
      object: {
        type: 'Follow',
        actor: 'https://ReMoTe.xn--kgbechtv/',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }
    });

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('create', () => {
  test('returns a promise which will be resolved with an Accept', async () => {
    const follow = await fabricateFollow();
    const recover = jest.fn();
    const accept = await Accept.create(repository, follow, signal, recover);

    expect(recover).not.toHaveBeenCalled();
    expect(accept).toBeInstanceOf(Accept);
    await expect(accept.select('object', signal, recover)).resolves.toBe(follow);
  });

  test('queues a delivery job if the actor is local and the object is remote', async () => {
    const recover = jest.fn();

    const [actor, object] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor', signal, recover))
        .then(unwrap),
      fabricateLocalAccount()
        .then(account => account.select('actor', signal, recover))
        .then(unwrap)
    ]);

    const follow = await fabricateFollow({ actor, object });

    await Accept.create(repository, follow, signal, recover);

    await expect((await repository.queue.getWaiting())[0])
      .toHaveProperty(['data', 'type'], 'accept');
  });
});
