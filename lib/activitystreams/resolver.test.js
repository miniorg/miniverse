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

import repository from '../test_repository';
import Resolver, { CircularError } from './resolver';
const nock = require('nock');

describe('resolve', () => {
  /*
    ActivityPub
    3.2 Retrieving objects
    https://www.w3.org/TR/activitypub/#retrieving-objects
    > The client MUST specify an Accept header with the
    > application/ld+json; profile="https://www.w3.org/ns/activitystreams"
    > media type in order to retrieve the activity.
  */
  beforeEach(() => nock('https://ReMoTe.إختبار')
    .matchHeader('Accept', 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"')
    .get('/')
    .reply(200, { '@context': 'https://www.w3.org/ns/activitystreams' }));

  afterEach(() => nock.cleanAll());

  test('resolves ActivityStreams representation', async () => {
    const origin = new Resolver;

    const { resolver, object } =
      await origin.resolve(repository, 'https://ReMoTe.إختبار/');

    expect(object).toEqual({
      '@context': 'https://www.w3.org/ns/activitystreams'
    });

    await expect(resolver.resolve(repository, 'https://ReMoTe.إختبار/'))
      .rejects
      .toBeInstanceOf(CircularError);
  });
});

test('rejects to resolve URLs given to the constructor', () => {
  const resolver = new Resolver(['https://ReMoTe.إختبار/']);

  return expect(resolver.resolve(repository, 'https://ReMoTe.إختبار/'))
    .rejects
    .toBeInstanceOf(CircularError);
});
