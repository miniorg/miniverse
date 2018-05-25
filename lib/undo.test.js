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
import LocalPerson from './local_person';
import ParsedActivityStreams,
       { AnyHost, TypeNotAllowed } from './parsed_activitystreams';
import repository from './test_repository';
import Undo from './undo';

async function fabricatePerson(username) {
  const person = new LocalPerson(repository, null, {
    admin: true,
    privateKeyPem: '',
    salt: '',
    serverKey: '',
    storedKey: '',
    username,
    host: null
  });

  await repository.insertLocalPerson(person);

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

    const follow = new Follow(repository, null, { actor, object });
    await repository.insertFollow(follow);

    await Undo.fromParsedActivityStreams(repository, actor, activity);

    await expect(repository.selectLocalPersonsByFollowee(object))
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

    await expect(Undo.fromParsedActivityStreams(repository, actor, activity))
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

    const follow = new Follow(repository, null, { actor, object });
    await repository.insertFollow(follow);

    await expect(Undo.fromParsedActivityStreams(repository, actor, activity))
      .resolves
      .toBeInstanceOf(Undo);
  });
});
