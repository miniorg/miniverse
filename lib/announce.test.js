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
import ParsedActivityStreams, {
  AnyHost,
  TypeNotAllowed
} from './parsed_activitystreams';
import {
  fabricateAnnounce,
  fabricateFollow,
  fabricateLocalAccount,
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
      id: 'https://xn--kgbechtv/@6/' + announce.id,
      type: 'Announce',
      published: null,
      object: 'https://ReMoTe.xn--kgbechtv/'
    });
  }));

describe('create', () => {
  test('inserts and returns a new Announce', async () => {
    const [{ actor }, object] = await Promise.all([
      fabricateRemoteAccount(),
      fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } } })
    ]);

    const announce = await Announce.create(
      repository,
      actor,
      object,
      { uri: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe' });

    expect(announce.repository).toBe(repository);
    expect(announce.status.repository).toBe(repository);
    expect(announce.status.published).toBe(null);
    expect(announce.status.actor).toBe(actor);
    expect(announce.status.uri.repository).toBe(repository);
    expect(announce.status.uri.uri).toBe('https://ReMoTe.xn--kgbechtv/AnNoUnCe');
    expect(announce.object).toBe(object);

    await expect(repository.selectStatusById(announce.id))
      .resolves
      .toHaveProperty('actorId', announce.status.actorId);
  });

  test('inserts into inboxes', async () => {
    const [[actorAccount, { object }], note] = await Promise.all([
      fabricateLocalAccount().then(account => Promise.all([
        account,
        fabricateFollow({ actor: account.actor })
      ])),
      fabricateNote()
    ]);

    const announce = await Announce.create(repository, object, note);

    expect((await actorAccount.select('inbox'))[0])
      .toHaveProperty('id', announce.id);
  });
});

describe('createFromParsedActivityStreams', () => {
  test('creates and returns an Announce from an ActivityStreams representation', async () => {
    const [{ actor }, object] = await Promise.all([
      fabricateRemoteAccount(),
      fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } } })
    ]);

    const announce = await Announce.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe',
        type: 'Announce',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        object: 'https://ReMoTe.xn--kgbechtv/oBjEcT'
      }, AnyHost),
      actor);

    expect(announce.repository).toBe(repository);
    expect(announce.status.repository).toBe(repository);
    expect(announce.status.published).toBe(null);
    expect(announce.status.actor).toBe(actor);
    expect(announce.status.uri.repository).toBe(repository);
    expect(announce.status.uri.uri).toBe('https://ReMoTe.xn--kgbechtv/AnNoUnCe');
    expect(announce.objectId).toBe(object.id);

    await expect(repository.selectStatusById(announce.id))
      .resolves
      .toHaveProperty('actorId', announce.status.actorId);
  });

  test('rejects with TypeNotAllowed if type is not Announce', async () => {
    const [{ actor }] = await Promise.all([
      fabricateRemoteAccount(),
      fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } } })
    ]);

    await expect(Announce.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        object: 'https://ReMoTe.xn--kgbechtv/oBjEcT'
      }, AnyHost),
      actor)).rejects.toBeInstanceOf(TypeNotAllowed);
  });

  test('resolves with null if audience does not include public', async () => {
    const [{ actor }] = await Promise.all([
      fabricateRemoteAccount(),
      fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } } })
    ]);

    await expect(Announce.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe',
        type: 'Announce',
        to: [],
        object: 'https://ReMoTe.xn--kgbechtv/oBjEcT'
      }, AnyHost),
      actor)).resolves.toBe(null);
  });
});
