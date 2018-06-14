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

import Follow from './follow';
import LocalAccount from './local_account';
import ParsedActivityStreams,
       { AnyHost, TypeNotAllowed } from './parsed_activitystreams';
import Person from './person';
import repository from './test_repository';
import Undo from './undo';

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

describe('fromParsedActivityStreams', () => {
  test('undos follow activity', async () => {
    const activity = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Undo',
      object: {
        type: 'Follow',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }
    }, AnyHost);

    const [actor, object] = await Promise.all([
      fabricatePerson('行動者'),
      fabricatePerson('被行動者')
    ]);

    await repository.insertFollow(new Follow({ repository, actor, object }));
    await Undo.fromParsedActivityStreams(repository, activity, actor);

    await expect(repository.selectPersonsByFolloweeId(object.id))
      .resolves
      .toEqual([]);
  });

  test('rejects with TypeNotAllowed if object type is uknown', async () => {
    const activity = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Undo',
      object: {
        type: 'Unknown',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }
    }, AnyHost);

    const [actor] = await Promise.all([
      fabricatePerson('行動者'),
      fabricatePerson('被行動者')
    ]);

    await expect(Undo.fromParsedActivityStreams(repository, activity, actor))
      .rejects.toBeInstanceOf(TypeNotAllowed);
  });

  test('resolves with undo', async () => {
    const activity = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Undo',
      object: {
        type: 'Follow',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }
    }, AnyHost);

    const [actor, object] = await Promise.all([
      fabricatePerson('行動者'),
      fabricatePerson('被行動者')
    ]);

    await repository.insertFollow(new Follow({ repository, actor, object }));

    await expect(Undo.fromParsedActivityStreams(repository, activity, actor))
      .resolves
      .toBeInstanceOf(Undo);
  });
});
