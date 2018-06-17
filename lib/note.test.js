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

import ParsedActivityStreams, { AnyHost } from './parsed_activitystreams';
import Note from './note';
import Mention from './mention';
import {
  fabricateFollow,
  fabricateNote,
  fabricateLocalAccount,
  fabricateRemoteAccount
} from './test/fabricator';
import repository from './test/repository';

describe('toActivityStreams', () => {
  test('resolves with ActivityStreams representation of local Note', async () => {
    const { person } =
      await fabricateLocalAccount({ person: { username: 'AtTrIbUTeDtO' } });

    const note = await fabricateNote({
      status: { repository, person },
      content: '内容',
      mentions: [new Mention({ repository, href: person })]
    });

    return expect(note.toActivityStreams()).resolves.toEqual({
      type: 'Note',
      id: 'https://xn--kgbechtv/@AtTrIbUTeDtO/' + note.id,
      attributedTo: 'https://xn--kgbechtv/@AtTrIbUTeDtO',
      to: 'https://www.w3.org/ns/activitystreams#Public',
      content: '内容',
      tag: [{ type: 'Mention', href: 'https://xn--kgbechtv/@AtTrIbUTeDtO' }]
    });
  });

  test('resolves with ActivityStreams representation of remote Note', async () => {
    const { person } = await fabricateRemoteAccount({
      person: {
        username: 'AtTrIbUTeDtO',
        host: 'AtTrIbUTeDtO.FiNgEr.xn--kgbechtv'
      },
      uri: { uri: '' }
    });

    const note = await fabricateNote({
      status: { person },
      content: '内容',
      mentions: [new Mention({ repository, href: person })]
    });

    return expect(note.toActivityStreams()).resolves.toEqual({
      type: 'Note',
      attributedTo: '',
      id: 'https://xn--kgbechtv/@AtTrIbUTeDtO@attributedto.finger.%D8%A5%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1/' + note.id,
      to: 'https://www.w3.org/ns/activitystreams#Public',
      content: '内容',
      tag: [{ type: 'Mention', href: '' }]
    });
  });
});

describe('create', () => {
  test('creates and returns a note', async () => {
    const attributedTo = await fabricateLocalAccount();

    const note = await Note.create(
      repository, null, attributedTo.person, '内容', [attributedTo.person]);

    expect(note).toBeInstanceOf(Note);
    expect(note.status.person).toBe(attributedTo.person);
    expect(note).toHaveProperty('content', '内容');
    expect(note.mentions[0])
      .toHaveProperty(['href', 'id'], attributedTo.person.id);
    expect((await repository.selectRecentStatusesIncludingExtensionsByPersonId(
      attributedTo.person.id))[0]).toHaveProperty('id', note.id);
    expect((await attributedTo.select('inbox'))[0])
      .toHaveProperty('id', note.id);
  });

  test('inserts into inboxes', async () => {
    const actorAccount = await fabricateLocalAccount();
    const { object } = await fabricateFollow({ actor: actorAccount.person });

    await Note.create(repository, null, object, '内容', []);

    expect((await actorAccount.select('inbox'))[0])
      .toHaveProperty(['extension', 'content'], '内容');
  });
});

describe('fromParsedActivityStreams', () => {
  test('resolves with an existent local note', async () => {
    const { person } =
      await fabricateLocalAccount({ person: { username: '' } });

    const { id } = await fabricateNote({ status: { person }, content: '内容' });

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://xn--kgbechtv/@/' + id,
         AnyHost))).resolves.toHaveProperty('content', '内容');
  });

  test('rejects local URI with incorrect username', async () => {
    const { person } =
      await fabricateLocalAccount({ person: { username: '' } });

    const note = await fabricateNote({ status: { person } });

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://xn--kgbechtv/@incorrect/' + note.id,
         AnyHost))).rejects.toBeInstanceOf(Error);
  });

  test('resolves with an existent remote note', async () => {
    await fabricateNote({
      status: { uri: { uri: 'https://NoTe.xn--kgbechtv/' } },
      content: '内容'
    });

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://NoTe.xn--kgbechtv/',
         AnyHost))).resolves.toHaveProperty('content', '内容');
  });

  test('creates and returns note from ActivityStreams representation', async () => {
    const [follow, mentioned] = await Promise.all([
      fabricateFollow(),
      fabricateLocalAccount({ person: { username: 'MeNtIoNeD' } })
    ]);

    const subscribedChannel = repository.getInboxChannel(follow.actor.account);
    let resolveStream;
    const asyncStream = new Promise(resolve => resolveStream = resolve);

    await repository.subscribe(subscribedChannel, (publishedChannel, message) => {
      const parsed = JSON.parse(message);

      expect(publishedChannel).toBe(subscribedChannel);
      expect(parsed).toHaveProperty('type', 'Note');
      expect(parsed).toHaveProperty('content', '内容');

      resolveStream();
    });

    const note = await Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        type: 'Note',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '内容',
        tag: [{ type: 'Mention', href: 'https://xn--kgbechtv/@MeNtIoNeD' }]
      }, AnyHost),
      follow.object);

    expect(note).toBeInstanceOf(Note);
    expect(note).toHaveProperty(['status', 'person'], follow.object);
    expect(note).toHaveProperty('content', '内容');
    expect(note.mentions[0]).toHaveProperty(['href', 'id'], mentioned.id);
    expect((await repository.selectRecentStatusesIncludingExtensionsByPersonId(follow.object.id))[0])
      .toHaveProperty('id', note.id);

    await asyncStream;
  });

  test('infers attribution if attributedTo argument is not given', async () => {
    const { person } = await fabricateRemoteAccount(
      { uri: { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' } });

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://NoTe.xn--kgbechtv/',
        type: 'Note',
        attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '内容',
        tag: []
      }, AnyHost)))
        .resolves
        .toHaveProperty(['status', 'personId'], person.id);
  });

  test('does not create if to does not include public', async () => {
    const { person } = await fabricateLocalAccount();

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        { type: 'Note', to: [], content: '内容', tag: [] },
        AnyHost),
      person)).resolves.toBe(null);
  });
});
