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

import { AbortController } from 'abort-controller';
import ParsedActivityStreams, { anyHost } from '../parsed_activitystreams';
import {
  fabricateAnnounce,
  fabricateFollow,
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Announce, { unexpectedType } from './announce';

const { signal } = new AbortController;

describe('toActivityStreams', () => {
  test('resolves with its ActivityStreams representation', async () => {
    const recover = jest.fn();
    const announce = unwrap(await fabricateAnnounce({
      status: { published: new Date('2000-01-01T00:00:00.000Z') },
      object: await fabricateNote(
        { status: { uri: 'https://ReMoTe.xn--kgbechtv/' } })
    }));

    await expect(announce.toActivityStreams(signal, recover)).resolves.toEqual({
      id: 'https://xn--kgbechtv/@6/' + announce.id,
      type: 'Announce',
      published: new Date('2000-01-01T00:00:00.000Z'),
      object: 'https://ReMoTe.xn--kgbechtv/'
    });

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('create', () => {
  test('inserts and returns a new Announce', async () => {
    const published = new Date;
    const recover = jest.fn();
    const [actor, object] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor', signal, recover))
        .then(unwrap),
      fabricateNote(
        { status: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } })
    ]);

    const announce = await Announce.create(repository, {
      status: {
        published,
        actor,
        uri: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe'
      },
      object
    }, signal, recover);

    await Promise.all([
      announce.select('status', signal, recover).then(nullableStatus => {
        const status = unwrap(nullableStatus);

        expect(status.published).toBe(published);
        expect(status.actor).toBe(actor);

        return Promise.all([
          expect(status.select('uri', signal, recover))
            .resolves
            .toHaveProperty('uri', 'https://ReMoTe.xn--kgbechtv/AnNoUnCe'),
          expect(repository.selectStatusById(announce.id, signal, recover))
            .resolves
            .toHaveProperty('actorId', status.actorId)
        ]);
      }),
      expect(announce.select('object', signal, recover)).resolves.toBe(object)
    ]);

    expect(recover).not.toHaveBeenCalled();
  });

  test('inserts into inboxes', async () => {
    const recover = jest.fn();

    const [[actorAccount, object], note] = await Promise.all([
      fabricateLocalAccount().then(account => Promise.all([
        account,
        account.select('actor', signal, recover)
          .then(unwrap)
          .then(actor => fabricateFollow({ actor }))
          .then(follow => follow.select('object', signal, recover))
          .then(unwrap)
      ])),
      fabricateNote()
    ]);

    const announce = await Announce.create(repository, {
      status: {
        published: new Date,
        actor: object,
        uri: null
      },
      object: note
    }, signal, recover);

    expect((await actorAccount.select('inbox', signal, recover))[0])
      .toHaveProperty('id', announce.id);

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('createFromParsedActivityStreams', () => {
  test('creates and returns an Announce from an ActivityStreams representation', async () => {
    const recover = jest.fn();

    const [actor, object] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor', signal, recover))
        .then(unwrap),
      fabricateNote(
        { status: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } })
    ]);

    const announce = unwrap(await Announce.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe',
        type: 'Announce',
        published: '2000-01-01T00:00:00.000Z',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        object: 'https://ReMoTe.xn--kgbechtv/oBjEcT'
      }, anyHost),
      actor,
      signal,
      recover));

    const status = unwrap(await announce.select('status', signal, recover));

    expect(status.published.toISOString())
      .toBe('2000-01-01T00:00:00.000Z');

    expect(announce.objectId).toBe(object.id);

    await Promise.all([
      expect(status.select('actor', signal, recover)).resolves.toBe(actor),
      expect(status.select('uri', signal, recover))
        .resolves
        .toHaveProperty('uri', 'https://ReMoTe.xn--kgbechtv/AnNoUnCe'),
      expect(repository.selectStatusById(announce.id, signal, recover))
        .resolves
        .toHaveProperty('actorId', status.actorId)
    ]);

    expect(recover).not.toHaveBeenCalled();
  });

  test('rejects if type is not Announce', async () => {
    const recover = jest.fn();
    const recovery = {};
    const [actor] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor', signal, recover))
        .then(unwrap),
      fabricateNote(
        { status: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } })
    ]);

    expect(recover).not.toHaveBeenCalled();

    await expect(Announce.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        object: 'https://ReMoTe.xn--kgbechtv/oBjEcT'
      }, anyHost),
      actor,
      signal,
      error => {
        expect(error[unexpectedType]).toBe(true);
        return recovery;
      })).rejects.toBe(recovery);
  });

  test('resolves with null if audience does not include public', async () => {
    const recover = jest.fn();
    const [actor] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor', signal, recover))
        .then(unwrap),
      fabricateNote(
        { status: { uri: 'https://ReMoTe.xn--kgbechtv/oBjEcT' } })
    ]);

    await expect(Announce.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://ReMoTe.xn--kgbechtv/AnNoUnCe',
        type: 'Announce',
        published: '2000-01-01T00:00:00.000Z',
        to: [],
        object: 'https://ReMoTe.xn--kgbechtv/oBjEcT'
      }, anyHost),
      actor,
      signal,
      recover)).resolves.toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });
});
