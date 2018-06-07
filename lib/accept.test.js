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

import Accept from './accept';
import Follow from './follow';
import LocalAccount from './local_account';
import Person from './person';
import RemoteAccount from './remote_account';
import repository from './test_repository';
import URI from './uri';

async function fabricateFollow() {
  const follow = new Follow({
    repository,
    actor: new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inbox: {
          uri: new URI({ repository, uri: 'https://AcToR.إختبار/?inbox' })
        },
        publicKey: { uri: new URI({ repository, uri: '' }), publicKeyPem: '' },
        uri: new URI({ repository, uri: '' })
      }),
      username: '行動者',
      host: 'FiNgEr.AcToR.إختبار'
    }),
    object: new Person({
      repository,
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
    repository.insertRemoteAccount(follow.actor.account),
    repository.insertLocalAccount(follow.object.account)
  ]);

  await repository.insertFollow(follow);

  return follow;
}

describe('toActivityStreams', () => {
  test('returns ActivityStreams representation', async () => {
    const accept = new Accept({ object: await fabricateFollow(), repository });

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
    expect(accept.object).toBe(follow);
    expect(accept.repository).toBe(repository);
  });

  test('queues a delivery job if the actor is local and the object is remote', async () => {
    const follow = await fabricateFollow();
    await Accept.create(repository, follow);

    await expect((await repository.queue.getWaiting())[0])
      .toHaveProperty(['data', 'type'], 'accept')
  });
});
