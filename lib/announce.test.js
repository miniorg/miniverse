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

import Announce from './announce';
import Note from './note';
import ParsedActivityStreams, { AnyHost } from './parsed_activitystreams';
import Person from './person';
import RemoteAccount from './remote_account';
import Status from './status';
import URI from './uri';
import repository from './test_repository';

describe('toActivityStreams', () =>
  test('resolves with its ActivityStreams representation', async () => {
    const person = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: '' }),
        publicKeyURI: new URI({ repository, uri: '' }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: '' })
      }),
      username: 'ReMoTe',
      host: 'ReMoTe.FiNgEr.xn--kgbechtv'
    });

    await repository.insertRemoteAccount(person.account);

    const object = new Note({
      repository,
      status: new Status({
        repository,
        person,
        uri: new URI({ repository, uri: 'https://ReMoTe.xn--kgbechtv/' })
      }),
      content: '内容',
      mentions: [],
    });

    await repository.insertNote(object);

    const announce = new Announce({
      repository,
      status: new Status({ repository, person }),
      object
    });

    await repository.insertAnnounce(announce);

    await expect(announce.toActivityStreams()).resolves.toEqual({
      type: 'Announce',
      object: 'https://ReMoTe.xn--kgbechtv/'
    });
  }));

describe('create', () => test('inserts and returns a new Announce', async () => {
  const person = new Person({
    repository,
    account: new RemoteAccount({
      repository,
      inboxURI: new URI({ repository, uri: '' }),
      publicKeyURI: new URI({ repository, uri: '' }),
      publicKeyPem: '',
      uri: new URI({ repository, uri: '' })
    }),
    username: 'ReMoTe',
    host: 'ReMoTe.FiNgEr.xn--kgbechtv'
  });

  await repository.insertRemoteAccount(person.account);

  const object = new Note({
    repository,
    status: new Status({
      repository,
      person,
      uri: new URI({ repository, uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' })
    }),
    content: '内容',
    mentions: [],
  });

  await repository.insertNote(object);

  const announce = await Announce.create(
    repository,
    person,
    object,
    'https://ReMoTe.xn--kgbechtv/AnNoUnCe');

  expect(announce.repository).toBe(repository);
  expect(announce.status.repository).toBe(repository);
  expect(announce.status.person).toBe(person);
  expect(announce.status.uri.repository).toBe(repository);
  expect(announce.status.uri.uri).toBe('https://ReMoTe.xn--kgbechtv/AnNoUnCe');
  expect(announce.object).toBe(object);

  await expect(repository.selectStatusById(announce.id))
    .resolves
    .toHaveProperty('personId', announce.status.personId);
}));

describe('fromParsedActivityStreams', () => {
  test('creates and returns an Announce from an ActivityStreams representation', async () => {
    const person = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: '' }),
        publicKeyURI: new URI({ repository, uri: '' }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: '' })
      }),
      username: 'ReMoTe',
      host: 'ReMoTe.FiNgEr.xn--kgbechtv'
    });

    await repository.insertRemoteAccount(person.account);

    const object = new Note({
      repository,
      status: new Status({
        repository,
        person,
        uri: new URI({ repository, uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' })
      }),
      content: '内容',
      mentions: [],
    });

    await repository.insertNote(object);

    const announce = await Announce.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe',
        type: 'Announce',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        object: 'https://ReMoTe.xn--kgbechtv/oBjEcT'
      }, AnyHost),
      person);

    expect(announce.repository).toBe(repository);
    expect(announce.status.repository).toBe(repository);
    expect(announce.status.person).toBe(person);
    expect(announce.status.uri.repository).toBe(repository);
    expect(announce.status.uri.uri).toBe('https://ReMoTe.xn--kgbechtv/AnNoUnCe');
    expect(announce.objectId).toBe(object.id);

    await expect(repository.selectStatusById(announce.id))
      .resolves
      .toHaveProperty('personId', announce.status.personId);
  });

  test('returns null if audience does not include public', async () => {
    const person = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: '' }),
        publicKeyURI: new URI({ repository, uri: '' }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: '' })
      }),
      username: 'ReMoTe',
      host: 'ReMoTe.FiNgEr.xn--kgbechtv'
    });

    await repository.insertRemoteAccount(person.account);

    const object = new Note({
      repository,
      status: new Status({
        repository,
        person,
        uri: new URI({ repository, uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' })
      }),
      content: '内容',
      mentions: [],
    });

    await repository.insertNote(object);

    await expect(Announce.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe',
        type: 'Announce',
        to: [],
        object: 'https://ReMoTe.xn--kgbechtv/oBjEcT'
      }, AnyHost),
      person)).resolves.toBe(null);
  });
});
