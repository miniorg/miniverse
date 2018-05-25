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

import BasePerson from './base_person';
import repository from './test_repository';

/*
  RFC 7565 - The 'acct' URI Scheme
  7. IANA Considerations
  https://tools.ietf.org/html/rfc7565#section-7
*/
describe('validate', () => {
  for (const username of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~!$&\'()*+,;=') {
    test(`accepts if username which starts with ${username}`, () => {
      const person = new BasePerson(repository, null, { username });
      return expect(person.validate()).resolves.toBe(undefined);
    });
  }

  test('throws an error if username has invalid first character', () => {
    const person = new BasePerson(repository, null, { username: '無効' });
      return expect(person.validate()).rejects.toBeInstanceOf(Error);
  });
});

describe('getUri', () => {
  test('returns URI of local person', async () => {
    const person = new BasePerson(
      repository, null, { username: 'ユーザー名', host: null });

    // host and username must be encoded.
    await expect(person.getUri())
      .resolves
      .toBe('https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D');
  });

  test('delegates to complete implementation if it is remote', async () => {
    class CompletePerson extends BasePerson {
      async getUri() {
        return 'https://ReMoTe.xn--kgbechtv/';
      }
    }

    class IncompletePerson extends BasePerson {
      selectComplete() {
        return new CompletePerson(repository, null);
      }
    }

    const person = new IncompletePerson(
      repository, null, { host: 'FiNgEr.ReMoTe.إختبار' });

    // URIs must properly be encoded.
    await expect(person.getUri()).resolves.toBe('https://ReMoTe.xn--kgbechtv/');
  });
});

describe('toActivityStreams', () => {
  test('delegates to complete implementation if it is local', async () => {
    const activityStreams = { id: 'https://xn--kgbechtv/' };

    class CompletePerson extends BasePerson {
      async toActivityStreams() {
        return activityStreams;
      }
    }

    class IncompletePerson extends BasePerson {
      selectComplete() {
        return new CompletePerson(repository, null);
      }
    }

    const person = new IncompletePerson(repository, null, { host: null });

    // URIs must properly be encoded.
    await expect(person.toActivityStreams()).resolves.toBe(activityStreams);
  });

  test('returns ActivityStreams representation of remote person', async () => {
    const person = new BasePerson(
      repository, null, { username: 'ユーザー名', host: 'FiNgEr.ReMoTe.إختبار' });

    // URIs must properly be encoded.
    await expect(person.toActivityStreams()).resolves.toEqual({
      id: 'https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D@FiNgEr.ReMoTe.%D8%A5%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1',
      type: 'Person',
      preferredUsername: 'ユーザー名',
      inbox: 'https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D@FiNgEr.ReMoTe.%D8%A5%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1/inbox',
      outbox: 'https://xn--kgbechtv/@%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%90%8D@FiNgEr.ReMoTe.%D8%A5%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1/outbox',
    });
  });
});
