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

import fetch from './fetch';
import TemporaryError from './temporary_error';
import repository from './test_repository';
import nock from 'nock';

test('assigns User-Agent header if the second argument is not present', () => {
  nock('https://ReMoTe.إختبار')
    .matchHeader('User-Agent', 'Miniverse (origin.example.com)')
    .get('/')
    .reply(200);

  return fetch(repository, 'https://ReMoTe.إختبار/').then(
    () => expect(nock.isDone()).toBe(true), nock.cleanAll.bind(nock));
});

test('assigns User-Agent header and given headers if the second argument is present', () => {
  nock('https://ReMoTe.إختبار')
    .matchHeader('Accept', 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"')
    .matchHeader('User-Agent', 'Miniverse (origin.example.com)')
    .get('/')
    .reply(200);

  return fetch(repository, 'https://ReMoTe.إختبار/', {
    headers: { Accept: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"' }
  }).then(() => expect(nock.isDone()).toBe(true), nock.cleanAll.bind(nock));
});

for (const code of [429, 500, 502, 503, 504]) {
  test(`rejects with TemporaryError if status code is ${code}`, async () => {
    nock('https://ReMoTe.إختبار').get('/').reply(code);

    try {
      await expect(fetch(repository, 'https://ReMoTe.إختبار/'))
       .rejects
       .toBeInstanceOf(TemporaryError);
    } finally {
      nock.cleanAll();
    }
  });
}

test('rejects with non-temporary error if status code is 400', async () => {
  nock('https://ReMoTe.إختبار').get('/').reply(400);

  try {
    const promise = fetch(repository, 'https://ReMoTe.إختبار/');

    await expect(promise).rejects.toBeInstanceOf(Error);
    await expect(promise).rejects.not.toBeInstanceOf(TemporaryError);
  } finally {
    nock.cleanAll();
  }
});

test('rejects with TemporaryError in case of network error', async () => {
  nock('https://ReMoTe.إختبار').get('/').replyWithError('');

  try {
    await expect(fetch(repository, 'https://ReMoTe.إختبار/'))
     .rejects
     .toBeInstanceOf(TemporaryError);
  } finally {
    nock.cleanAll();
  }
});
