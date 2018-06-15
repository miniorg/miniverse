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
import ParsedActivityStreams, { AnyHost } from './parsed_activitystreams';
import {
  fabricateAnnounce,
  fabricateNote,
  fabricateRemoteAccount
} from './test/fabricator';
import repository from './test/repository';

describe('toActivityStreams', () =>
  test('resolves with its ActivityStreams representation', async () => {
    const announce = await fabricateAnnounce({
      object: await fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/' } } })
    });

    await expect(announce.toActivityStreams()).resolves.toEqual({
      type: 'Announce',
      object: 'https://ReMoTe.xn--kgbechtv/'
    });
  }));

describe('create', () => test('inserts and returns a new Announce', async () => {
  const [{ person }, object] = await Promise.all([
    fabricateRemoteAccount(),
    fabricateNote(
      { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } } })
  ]);

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
    const [{ person }, object] = await Promise.all([
      fabricateRemoteAccount(),
      fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } } })
    ]);

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
    const [{ person }] = await Promise.all([
      fabricateRemoteAccount(),
      fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } } })
    ]);

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
