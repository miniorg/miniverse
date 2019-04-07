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

import {
  fabricateAccept,
  fabricateFollow,
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Accept from './accept';

describe('toActivityStreams', () => {
  test('returns ActivityStreams representation', async () => {
    const [actor, object] = await Promise.all([
      fabricateRemoteAccount({ uri: { uri: '' } })
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateLocalAccount({ actor: { username: '被行動者' } })
        .then(account => account.select('actor'))
        .then(unwrap)
    ]);

    const accept = await fabricateAccept({
      object: await fabricateFollow({ actor, object })
    });

    return expect(accept.toActivityStreams()).resolves.toEqual({
      type: 'Accept',
      object: {
        type: 'Follow',
        actor: '',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }
    });
  });
});

describe('create', () => {
  test('returns a promise which will be resolved with an Accept', async () => {
    const follow = await fabricateFollow();
    const accept = await Accept.create(repository, follow);

    expect(accept).toBeInstanceOf(Accept);
    await expect(accept.select('object')).resolves.toBe(follow);
  });

  test('queues a delivery job if the actor is local and the object is remote', async () => {
    const [actor, object] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateLocalAccount()
        .then(account => account.select('actor'))
        .then(unwrap)
    ]);

    const follow = await fabricateFollow({ actor, object });

    await Accept.create(repository, follow);

    await expect((await repository.queue.getWaiting())[0])
      .toHaveProperty(['data', 'type'], 'accept');
  });
});
