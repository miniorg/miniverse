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
  fabricateLocalAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Undo, { unexpectedType } from './undo';

const { signal } = new AbortController;

describe('createFromParsedActivityStreams', () => {
  test('undoes announce activity', async () => {
    const recover = jest.fn();

    const announce = await fabricateAnnounce(
      { status: { uri: 'https://NoTe.xn--kgbechtv/' } });

    const status = unwrap(await announce.select('status', signal, recover));
    const actor = unwrap(await status.select('actor', signal, recover));

    const activity = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Undo',
      object: { type: 'Announce', id: 'https://NoTe.xn--kgbechtv/' }
    }, anyHost);

    await Undo.createFromParsedActivityStreams(repository, activity, actor, signal, recover);

    await expect(repository.selectStatusById(status.id, signal, recover))
      .resolves.toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });

  test('undoes follow activity', async () => {
    const recover = jest.fn();

    const activity = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Undo',
      object: {
        type: 'Follow',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }
    }, anyHost);

    const [actor, object] = await Promise.all([
      fabricateLocalAccount()
        .then(account => account.select('actor', signal, recover))
        .then(unwrap),
      fabricateLocalAccount({ actor: { username: '被行動者' } })
        .then(account => account.select('actor', signal, recover))
        .then(unwrap)
    ]);

    await fabricateFollow({ actor, object });

    await Undo.createFromParsedActivityStreams(repository, activity, actor, signal, recover);

    await expect(repository.selectActorsByFolloweeId(object.id, signal, recover))
      .resolves
      .toEqual([]);

    expect(recover).not.toHaveBeenCalled();
  });

  test('rejects if type is unknown', async () => {
    const recover = jest.fn();

    const announce = await fabricateAnnounce(
      { status: { uri: 'https://NoTe.xn--kgbechtv/' } });

    const status = unwrap(await announce.select('status', signal, recover));
    const actor = unwrap(await status.select('actor', signal, recover));

    expect(recover).not.toHaveBeenCalled();

    const activity = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      object: { type: 'Announce', id: 'https://NoTe.xn--kgbechtv/' }
    }, anyHost);

    const recovery = {};

    await expect(Undo.createFromParsedActivityStreams(repository, activity, actor, signal, error => {
      expect(error[unexpectedType]).toBe(true);
      return recovery;
    })).rejects.toBe(recovery);
  });

  test('rejects if object type is uknown', async () => {
    const activity = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Undo',
      object: {
        type: 'Unknown',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }
    }, anyHost);

    const [actor] = await Promise.all([
      fabricateLocalAccount(),
      fabricateLocalAccount({ actor: { username: '被行動者' } })
    ]);
    const recover = jest.fn();
    const actorActor = unwrap(await actor.select('actor', signal, recover));
    const recovery = {};

    expect(recover).not.toHaveBeenCalled();

    await expect(Undo.createFromParsedActivityStreams(repository, activity, actorActor, signal, () => recovery))
      .rejects.toBe(recovery);
  });

  test('resolves with undo', async () => {
    const recover = jest.fn();

    const activity = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Undo',
      object: {
        type: 'Follow',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }
    }, anyHost);

    const objectAccount =
      await fabricateLocalAccount({ actor: { username: '被行動者' } });

    const object = unwrap(await objectAccount.select('actor', signal, recover));
    const follow = await fabricateFollow({ object });
    const actor = unwrap(await follow.select('actor', signal, recover));

    await expect(Undo.createFromParsedActivityStreams(repository, activity, actor, signal, recover))
      .resolves.toBeInstanceOf(Undo);

    expect(recover).not.toHaveBeenCalled();
  });
});
