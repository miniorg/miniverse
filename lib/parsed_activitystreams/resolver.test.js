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

import nock from 'nock';
import repository from '../test/repository';
import Resolver, { CircularError } from './resolver';

function testLoading(body, callback) {
  return async () => {
    /*
      ActivityPub
      3.2 Retrieving objects
      https://www.w3.org/TR/activitypub/#retrieving-objects
      > The client MUST specify an Accept header with the
      > application/ld+json; profile="https://www.w3.org/ns/activitystreams"
      > media type in order to retrieve the activity.
    */
    nock('https://ReMoTe.إختبار')
      .matchHeader('Accept', 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"')
      .get('/')
      .reply(200, body);

    try {
      await callback();
    } finally {
      nock.cleanAll();
    }
  };
}

describe('resolve', () => {
  test('resolves URIs without fragment', testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams'
  }, async () => {
    const origin = new Resolver;

    const { resolver, context, body } =
      await origin.resolve(repository, 'https://ReMoTe.إختبار/');

    expect(context).toBe('https://www.w3.org/ns/activitystreams');

    expect(body).toEqual({
      '@context': 'https://www.w3.org/ns/activitystreams'
    });

    await expect(resolver.resolve(repository, 'https://ReMoTe.إختبار/'))
      .rejects
      .toBeInstanceOf(CircularError);
  }));

  /*
    While ActivityStreams requires id must be absolute URI, fragment resolution
    is also used for non-ActivityStreams representation. (The Security
    Vocabulary)
  */
  test('resolves frament URIs without base URIs', testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    publicKey: { id: '#key' }
  }, async () => {
    const origin = new Resolver;

    const { resolver, context, body } =
      await origin.resolve(repository, 'https://ReMoTe.إختبار/#key');

    expect(context).toBe('https://www.w3.org/ns/activitystreams');
    expect(body).toEqual({ id: '#key' });

    await expect(resolver.resolve(repository, 'https://ReMoTe.إختبار/#key'))
      .rejects
      .toBeInstanceOf(CircularError);
  }));

  test('resolves frament URIs with base URIs', testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    publicKey: { id: 'https://ReMoTe.إختبار/#key' }
  }, async () => {
    const origin = new Resolver;

    const { resolver, context, body } =
      await origin.resolve(repository, 'https://ReMoTe.إختبار/#key');

    expect(context).toBe('https://www.w3.org/ns/activitystreams');
    expect(body).toEqual({ id: 'https://ReMoTe.إختبار/#key' });

    await expect(resolver.resolve(repository, 'https://ReMoTe.إختبار/#key'))
      .rejects
      .toBeInstanceOf(CircularError);
  }));

  test('resolves with fragment context', testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    publicKey: { '@context': 'https://w3id.org/security/v1', id: '#key' }
  }, () => {
    const origin = new Resolver;

    return expect(origin.resolve(repository, 'https://ReMoTe.إختبار/#key'))
      .resolves
      .toHaveProperty('context', 'https://w3id.org/security/v1');
  }));

  test('rejects fragment id if in context', testLoading({
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      { id: '#key' }
    ]
  }, () => {
    const origin = new Resolver;

    return expect(origin.resolve(repository, 'https://ReMoTe.إختبار/#key'))
      .rejects
      .toBeInstanceOf(Error);
  }));
});

test('rejects consumed URIs given to the constructor', () => {
  const resolver = new Resolver([['https://ReMoTe.إختبار/', null]]);

  return expect(resolver.resolve(repository, 'https://ReMoTe.إختبار/'))
    .rejects
    .toBeInstanceOf(CircularError);
});
