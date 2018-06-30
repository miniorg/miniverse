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
} from './parsed_activitystreams';
import Note from './note';
import {
  fabricateFollow,
  fabricateNote,
  fabricateLocalAccount,
  fabricateRemoteAccount
} from './test/fabricator';
import repository from './test/repository';

describe('toActivityStreams', () => {
  test('resolves with ActivityStreams representation of local Note', async () => {
    const { actor } =
      await fabricateLocalAccount({ actor: { username: 'AtTrIbUTeDtO' } });

    const note = await fabricateNote({
      status: { repository, actor },
      summary: '要約',
      content: '内容',
      hashtags: [{ name: '名前' }],
      mentions: [{ href: actor }]
    });

    return expect(note.toActivityStreams()).resolves.toEqual({
      type: 'Note',
      id: 'https://xn--kgbechtv/@AtTrIbUTeDtO/' + note.id,
      published: null,
      attributedTo: 'https://xn--kgbechtv/@AtTrIbUTeDtO',
      to: 'https://www.w3.org/ns/activitystreams#Public',
      inReplyTo: null,
      summary: '要約',
      content: '内容',
      tag: [
        { type: 'Hashtag', name: '名前' },
        { type: 'Mention', href: 'https://xn--kgbechtv/@AtTrIbUTeDtO' }
      ]
    });
  });

  test('resolves with ActivityStreams representation of remote Note', async () => {
    const { actor } = await fabricateRemoteAccount({
      actor: {
        username: 'AtTrIbUTeDtO',
        host: 'AtTrIbUTeDtO.FiNgEr.xn--kgbechtv'
      },
      uri: { uri: '' }
    });

    const note = await fabricateNote({
      status: { actor },
      content: '内容',
      hashtags: [{ name: '名前' }],
      mentions: [{ href: actor }]
    });

    return expect(note.toActivityStreams()).resolves.toEqual({
      type: 'Note',
      published: null,
      attributedTo: '',
      id: 'https://xn--kgbechtv/@AtTrIbUTeDtO@attributedto.finger.%D8%A5%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1/' + note.id,
      to: 'https://www.w3.org/ns/activitystreams#Public',
      inReplyTo: null,
      summary: null,
      content: '内容',
      tag: [{ type: 'Hashtag', name: '名前' }, { type: 'Mention', href: '' }]
    });
  });
});

describe('create', () => {
  test('creates and returns a note', async () => {
    const attributedTo = await fabricateLocalAccount();

    const note = await Note.create(
      repository,
      attributedTo.actor,
      '内容',
      { hashtags: ['名前'], mentions: [attributedTo.actor] });

    expect(note).toBeInstanceOf(Note);
    expect(note.status.published).toBe(null);
    expect(note.status.actor).toBe(attributedTo.actor);
    expect(note).toHaveProperty('summary', null);
    expect(note).toHaveProperty('content', '内容');
    expect(note.hashtags[0]).toHaveProperty('name', '名前');
    expect(note.mentions[0])
      .toHaveProperty(['href', 'id'], attributedTo.actor.id);
    expect((await repository.selectRecentStatusesIncludingExtensionsByActorId(
      attributedTo.actor.id))[0]).toHaveProperty('id', note.id);
    expect((await attributedTo.select('inbox'))[0])
      .toHaveProperty('id', note.id);
  });

  test('inserts into inboxes', async () => {
    const actorAccount = await fabricateLocalAccount();
    const { object } = await fabricateFollow({ actor: actorAccount.actor });

    await Note.create(repository, object, '内容');

    expect((await actorAccount.select('inbox'))[0])
      .toHaveProperty(['extension', 'content'], '内容');
  });
});

describe('createFromParsedActivityStreams', () => {
  test('creates and returns note from ActivityStreams representation', async () => {
    const [follow, mentioned] = await Promise.all([
      fabricateFollow(),
      fabricateLocalAccount({ actor: { username: 'MeNtIoNeD' } })
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

    const note = await Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        type: 'Note',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '内容',
        tag: [
          { type: 'Hashtag', name: '名前' },
          { type: 'Mention', href: 'https://xn--kgbechtv/@MeNtIoNeD' }
        ]
      }, AnyHost),
      follow.object);

    expect(note).toBeInstanceOf(Note);
    expect(note).toHaveProperty(['status', 'actor'], follow.object);
    expect(note).toHaveProperty('content', '内容');
    expect(note.hashtags[0]).toHaveProperty('name', '名前');
    expect(note.mentions[0]).toHaveProperty(['href', 'id'], mentioned.id);
    expect((await repository.selectRecentStatusesIncludingExtensionsByActorId(follow.object.id))[0])
      .toHaveProperty('id', note.id);

    await asyncStream;
  });

  test('infers attribution if attributedTo argument is not given', async () => {
    const { actor } = await fabricateRemoteAccount(
      { uri: { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' } });

    await expect(Note.createFromParsedActivityStreams(
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
        .toHaveProperty(['status', 'actorId'], actor.id);
  });

  test('does not create if to does not include public', async () => {
    const { actor } = await fabricateLocalAccount();

    await expect(Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        { type: 'Note', to: [], content: '内容', tag: [] },
        AnyHost),
      actor)).resolves.toBe(null);
  });

  test('rejects with TypeNotAllowed if type is not Note', async () => {
    await fabricateRemoteAccount(
      { uri: { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' } });

    await expect(Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://NoTe.xn--kgbechtv/',
        attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '',
        tag: []
      }, AnyHost))).rejects.toBeInstanceOf(TypeNotAllowed);
  });

  test('resolves inReplyTo with a local note', async () => {
    const [[inReplyToId, inReplyTo]] = await Promise.all([
      fabricateNote({ status: { uri: null } })
        .then(({ status }) => Promise.all([status.id, status.getUri()])),
      fabricateRemoteAccount(
        { uri: { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' } })
    ]);

    await expect(Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://NoTe.xn--kgbechtv/',
        type: 'Note',
        attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        inReplyTo,
        content: '',
        tag: []
      }, AnyHost))).resolves.toHaveProperty('inReplyToId', inReplyToId);
  });

  test('rejects inReplyTo of local URI with incorrect username', async () => {
    const [inReplyToId] = await Promise.all([
      fabricateNote({ status: { uri: null } }).then(({ status }) => status.id),
      fabricateRemoteAccount(
        { uri: { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' } })
    ]);

    await expect(Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://NoTe.xn--kgbechtv/',
        type: 'Note',
        attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        inReplyTo: 'https://xn--kgbechtv/@incorrect/' + inReplyToId,
        content: '',
        tag: []
      }, AnyHost))).rejects.toBeInstanceOf(Error);
  });

  test('resolves inReplyTo with a remote note', async () => {
    await fabricateRemoteAccount(
      { uri: { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' } });

    const { inReplyToId } = await Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://NoTe.xn--kgbechtv/',
        type: 'Note',
        attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        inReplyTo: 'https://iNrEpLyTo.xn--kgbechtv/',
        content: '',
        tag: []
      }, AnyHost));

    await expect(repository.selectURIById(inReplyToId))
      .resolves
      .toHaveProperty('uri', 'https://iNrEpLyTo.xn--kgbechtv/');
  });
});

describe('fromParsedActivityStreams', () => {
  test('resolves with an existent local note', async () => {
    const { actor } =
      await fabricateLocalAccount({ actor: { username: '' } });

    const { id } = await fabricateNote({ status: { actor }, content: '内容' });

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://xn--kgbechtv/@/' + id,
         AnyHost))).resolves.toHaveProperty('content', '内容');
  });

  test('rejects local URI with incorrect username', async () => {
    const { actor } =
      await fabricateLocalAccount({ actor: { username: '' } });

    const note = await fabricateNote({ status: { actor } });

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
    const { actor } = await fabricateLocalAccount();

    const note = await Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        type: 'Note',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '',
        tag: []
      }, AnyHost),
      actor);

    expect(note).toBeInstanceOf(Note);
    expect(note).toHaveProperty(['status', 'actor'], actor);
  });
});
