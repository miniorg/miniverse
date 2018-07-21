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

import ParsedActivityStreams, {
  AnyHost,
  TypeNotAllowed
} from '../parsed_activitystreams';
import {
  fabricateAnnounce,
  fabricateFollow,
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Announce from './announce';

describe('toActivityStreams', () =>
  test('resolves with its ActivityStreams representation', async () => {
    const announce = await fabricateAnnounce({
      status: { published: new Date('2000-01-01T00:00:00.000Z') },
      object: await fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/' } } })
    });

    await expect(announce.toActivityStreams()).resolves.toEqual({
      id: 'https://xn--kgbechtv/@6/' + announce.id,
      type: 'Announce',
      published: new Date('2000-01-01T00:00:00.000Z'),
      object: 'https://ReMoTe.xn--kgbechtv/'
    });
  }));

describe('create', () => {
  test('inserts and returns a new Announce', async () => {
    const published = new Date;
    const [actor, object] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } } })
    ]);

    const announce = await Announce.create(
      repository,
      published,
      actor,
      object,
      'https://ReMoTe.xn--kgbechtv/AnNoUnCe');

    expect(announce.repository).toBe(repository);

    await Promise.all([
      announce.select('status').then(status => {
        expect(status.repository).toBe(repository);
        expect(status.published).toBe(published);
        expect(status.actor).toBe(actor);

        return Promise.all([
          expect(status.select('uri'))
            .resolves
            .toHaveProperty('uri', 'https://ReMoTe.xn--kgbechtv/AnNoUnCe'),
          expect(repository.selectStatusById(unwrap(announce.id)))
            .resolves
            .toHaveProperty('actorId', status.actorId)
        ]);
      }),
      expect(announce.select('object')).resolves.toBe(object)
    ]);
  });

  test('inserts into inboxes', async () => {
    const [[actorAccount, object], note] = await Promise.all([
      fabricateLocalAccount().then(account => Promise.all([
        account,
        account.select('actor')
               .then(unwrap)
               .then(actor => fabricateFollow({ actor }))
               .then(follow => follow.select('object'))
               .then(unwrap)
      ])),
      fabricateNote()
    ]);

    const announce = await Announce.create(repository, new Date, object, note);

    expect((await actorAccount.select('inbox'))[0])
      .toHaveProperty('id', announce.id);
  });
});

describe('createFromParsedActivityStreams', () => {
  test('creates and returns an Announce from an ActivityStreams representation', async () => {
    const [actor, object] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } } })
    ]);

    const announce = await Announce.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe',
        type: 'Announce',
        published: '2000-01-01T00:00:00.000Z',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        object: 'https://ReMoTe.xn--kgbechtv/oBjEcT'
      }, AnyHost),
      actor);

    const status = unwrap(await announce.select('status'));

    expect(status.published.toISOString())
      .toBe('2000-01-01T00:00:00.000Z');

    expect(announce.objectId).toBe(unwrap(object.id));

    await Promise.all([
      expect(status.select('actor')).resolves.toBe(actor),
      expect(status.select('uri'))
        .resolves
        .toHaveProperty('uri', 'https://ReMoTe.xn--kgbechtv/AnNoUnCe'),
      expect(repository.selectStatusById(unwrap(announce.id)))
        .resolves
        .toHaveProperty('actorId', status.actorId)
    ]);
  });

  test('rejects with TypeNotAllowed if type is not Announce', async () => {
    const [actor] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
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
    const [actor] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateNote(
        { status: { uri: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } } })
    ]);

    await expect(Announce.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe',
        type: 'Announce',
        published: '2000-01-01T00:00:00.000Z',
        to: [],
        object: 'https://ReMoTe.xn--kgbechtv/oBjEcT'
      }, AnyHost),
      actor)).resolves.toBe(null);
  });
});
