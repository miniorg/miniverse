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

import { Custom as CustomError } from '../errors';
import ParsedActivityStreams, {
  AnyHost,
  TypeNotAllowed
} from '../parsed_activitystreams';
import {
  fabricateFollow,
  fabricateNote,
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Note from './note';

describe('toActivityStreams', () => {
  test('resolves with ActivityStreams representation of local Note', async () => {
    const account =
      await fabricateLocalAccount({ actor: { username: 'AtTrIbUTeDtO' } });

    const actor = unwrap(await account.select('actor'));
    const note = await fabricateNote({
      status: {
        published: new Date('2000-01-01T00:00:00.000Z'),
        actor
      },
      summary: '要約',
      content: '内容',
      attachments: [],
      hashtags: [{ name: '名前' }],
      mentions: [{ href: actor }]
    });

    return expect(note.toActivityStreams()).resolves.toEqual({
      type: 'Note',
      id: 'https://xn--kgbechtv/@AtTrIbUTeDtO/' + note.id,
      published: new Date('2000-01-01T00:00:00.000Z'),
      attributedTo: 'https://xn--kgbechtv/@AtTrIbUTeDtO',
      to: 'https://www.w3.org/ns/activitystreams#Public',
      inReplyTo: null,
      summary: '要約',
      content: '内容',
      attachment: [],
      tag: [
        { type: 'Hashtag', name: '名前' },
        { type: 'Mention', href: 'https://xn--kgbechtv/@AtTrIbUTeDtO' }
      ]
    });
  });

  test('resolves with ActivityStreams representation of remote Note', async () => {
    const account = await fabricateRemoteAccount({
      actor: {
        username: 'AtTrIbUTeDtO',
        host: 'AtTrIbUTeDtO.FiNgEr.xn--kgbechtv'
      },
      uri: { uri: '' }
    });

    const actor = unwrap(await account.select('actor'));
    const note = await fabricateNote({
      status: {
        published: new Date('2000-01-01T00:00:00.000Z'),
        actor
      },
      content: '内容',
      attachments: [],
      hashtags: [{ name: '名前' }],
      mentions: [{ href: actor }]
    });

    return expect(note.toActivityStreams()).resolves.toEqual({
      type: 'Note',
      published: new Date('2000-01-01T00:00:00.000Z'),
      attributedTo: '',
      id: 'https://xn--kgbechtv/@AtTrIbUTeDtO@attributedto.finger.%D8%A5%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1/' + note.id,
      to: 'https://www.w3.org/ns/activitystreams#Public',
      inReplyTo: null,
      summary: null,
      content: '内容',
      attachment: [],
      tag: [{ type: 'Hashtag', name: '名前' }, { type: 'Mention', href: '' }]
    });
  });
});

describe('create', () => {
  test('creates and returns a note', async () => {
    const attributedTo = await fabricateLocalAccount();
    const attributedToActor = unwrap(await attributedTo.select('actor'));
    const published = new Date;

    const note = await Note.create(
      repository,
      published,
      attributedToActor,
      '内容',
      { hashtags: ['名前'], mentions: [attributedToActor] });

    const [
      status, hashtags, mentions, ownedStatuses,
      inbox
    ] = await Promise.all([
      note.select('status').then(unwrap),
      note.select('hashtags'),
      note.select('mentions'),
      repository.selectRecentStatusesIncludingExtensionsByActorId(
        unwrap(attributedToActor.id)),
      attributedTo.select('inbox')
    ]);

    expect(note).toBeInstanceOf(Note);
    expect(status.published).toBe(published);
    expect(status.select('actor')).resolves.toBe(attributedToActor);
    expect(note).toHaveProperty('summary', null);
    expect(note).toHaveProperty('content', '内容');
    expect(hashtags[0]).toHaveProperty('name', '名前');
    expect(mentions[0]).toHaveProperty(['href', 'id'], attributedToActor.id);
    expect(ownedStatuses[0]).toHaveProperty('id', note.id);
    expect(inbox[0]).toHaveProperty('id', note.id);
  });

  test('sanitizes HTML', async () => {
    const attributedTo = await fabricateLocalAccount();

    const note = await Note.create(
      repository,
      new Date,
      unwrap(await attributedTo.select('actor')),
      '内容<script>alert("XSS");</script>',
      { summary: '要約<script>alert("XSS");</script>' });

    expect(note).toHaveProperty('content', '内容');
    expect(note).toHaveProperty('summary', '要約');
  });

  test('inserts into inboxes', async () => {
    const actorAccount = await fabricateLocalAccount();
    const actor = unwrap(await actorAccount.select('actor'));
    const follow = await fabricateFollow({ actor });
    const object = unwrap(await follow.select('object'));

    await Note.create(repository, new Date, object, '内容');

    expect((await actorAccount.select('inbox'))[0])
      .toHaveProperty(['extension', 'content'], '内容');
  });
});

describe('createFromParsedActivityStreams', () => {
  test('creates and returns note from ActivityStreams representation', async () => {
    const [[actor, object], mentioned] = await Promise.all([
      fabricateFollow().then(follow => Promise.all(
        [unwrap(follow.select('actor')), unwrap(follow.select('object'))])),
      fabricateLocalAccount({ actor: { username: 'MeNtIoNeD' } })
    ]);

    const subscribedChannel = repository.getInboxChannel(actor.account);
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
        published: '2000-01-01T00:00:00.000Z',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '内容',
        attachment: [],
        tag: [
          { type: 'Hashtag', name: '名前' },
          { type: 'Mention', href: 'https://xn--kgbechtv/@MeNtIoNeD' }
        ]
      }, AnyHost),
      object);

    const objectId = unwrap(object.id);
    const [hashtags, mentions, ownedStatuses] = await Promise.all([
      note.select('hashtags'),
      note.select('mentions'),
      repository.selectRecentStatusesIncludingExtensionsByActorId(objectId)
    ]);

    expect(note).toBeInstanceOf(Note);
    expect(note).toHaveProperty(['status', 'actor'], object);
    expect(note).toHaveProperty('content', '内容');
    expect(hashtags[0]).toHaveProperty('name', '名前');
    expect(mentions[0]).toHaveProperty(['href', 'id'], unwrap(mentioned.id));
    expect(ownedStatuses[0]).toHaveProperty('id', note.id);

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
        published: '2000-01-01T00:00:00.000Z',
        attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '内容',
        attachment: [],
        tag: []
      }, AnyHost)))
        .resolves
        .toHaveProperty(['status', 'actorId'], actor.id);
  });

  test('does not create if to does not include public', async () => {
    const account = await fabricateLocalAccount();

    await expect(Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        { type: 'Note', to: [], content: '内容', attachment: [], tag: [] },
        AnyHost),
      unwrap(await account.select('actor')))).resolves.toBe(null);
  });

  test('rejects with TypeNotAllowed if type is not Note', async () => {
    await fabricateRemoteAccount(
      { uri: { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' } });

    await expect(Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://NoTe.xn--kgbechtv/',
        published: '2000-01-01T00:00:00.000Z',
        attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '',
        attachment: [],
        tag: []
      }, AnyHost))).rejects.toBeInstanceOf(TypeNotAllowed);
  });

  test('resolves inReplyTo with a local note', async () => {
    const [[inReplyToId, inReplyTo]] = await Promise.all([
      fabricateNote({ status: { uri: null } })
        .then(note => note.select('status'))
        .then(unwrap)
        .then(status => Promise.all([status.id, status.getUri()])),
      fabricateRemoteAccount(
        { uri: { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' } })
    ]);

    await expect(Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://NoTe.xn--kgbechtv/',
        type: 'Note',
        published: '2000-01-01T00:00:00.000Z',
        attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        inReplyTo,
        content: '',
        attachment: [],
        tag: []
      }, AnyHost))).resolves.toHaveProperty('inReplyToId', inReplyToId);
  });

  test('rejects inReplyTo of local URI with incorrect username', async () => {
    const [inReplyToId] = await Promise.all([
      fabricateNote({ status: { uri: null } })
        .then(note => note.select('status'))
        .then(status => unwrap(status).id),
      fabricateRemoteAccount(
        { uri: { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' } })
    ]);

    await expect(Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://NoTe.xn--kgbechtv/',
        type: 'Note',
        published: '2000-01-01T00:00:00.000Z',
        attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        inReplyTo: 'https://xn--kgbechtv/@incorrect/' + inReplyToId,
        content: '',
        attachment: [],
        tag: []
      }, AnyHost))).rejects.toBeInstanceOf(CustomError);
  });

  test('resolves inReplyTo with a remote note', async () => {
    await fabricateRemoteAccount(
      { uri: { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' } });

    const { inReplyToId } = await Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        id: 'https://NoTe.xn--kgbechtv/',
        type: 'Note',
        published: '2000-01-01T00:00:00.000Z',
        attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        inReplyTo: 'https://iNrEpLyTo.xn--kgbechtv/',
        content: '',
        attachment: [],
        tag: []
      }, AnyHost));

    await expect(repository.selectURIById(inReplyToId))
      .resolves
      .toHaveProperty('uri', 'https://iNrEpLyTo.xn--kgbechtv/');
  });
});

describe('fromParsedActivityStreams', () => {
  test('resolves with an existent local note', async () => {
    const account = await fabricateLocalAccount({ actor: { username: '' } });
    const actor = unwrap(await account.select('actor'));

    const { id } = await fabricateNote({ status: { actor }, content: '内容' });

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://xn--kgbechtv/@/' + id,
         AnyHost))).resolves.toHaveProperty('content', '内容');
  });

  test('rejects local URI with incorrect username', async () => {
    const account = await fabricateLocalAccount({ actor: { username: '' } });
    const actor = unwrap(await account.select('actor'));

    const note = await fabricateNote({ status: { actor } });

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://xn--kgbechtv/@incorrect/' + note.id,
         AnyHost))).rejects.toBeInstanceOf(CustomError);
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
    const account = await fabricateLocalAccount();
    const actor = unwrap(await account.select('actor'));

    const note = await Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        type: 'Note',
        published: '2000-01-01T00:00:00.000Z',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '',
        attachment: [],
        tag: []
      }, AnyHost),
      actor);

    expect(note).toBeInstanceOf(Note);
    expect(note).toHaveProperty(['status', 'actor'], actor);
  });
});
