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
  fabricateFollow,
  fabricateNote,
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Note, { unexpectedType } from './note';

const { signal } = new AbortController;

describe('toActivityStreams', () => {
  test('resolves with ActivityStreams representation of local Note', async () => {
    const account =
      await fabricateLocalAccount({ actor: { username: 'AtTrIbUTeDtO' } });

    const recover = jest.fn();

    const actor = unwrap(await account.select('actor', signal, recover));
    const note = await fabricateNote({
      status: {
        published: new Date('2000-01-01T00:00:00.000Z'),
        actor
      },
      summary: '要約',
      content: '内容',
      attachments: [],
      hashtags: ['名前'],
      mentions: [actor]
    });

    await expect(note.toActivityStreams(signal, recover)).resolves.toEqual({
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

    expect(recover).not.toHaveBeenCalled();
  });

  test('resolves with ActivityStreams representation of remote Note', async () => {
    const account = await fabricateRemoteAccount({
      actor: {
        username: 'AtTrIbUTeDtO',
        host: 'AtTrIbUTeDtO.FiNgEr.xn--kgbechtv'
      },
      uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/'
    });

    const recover = jest.fn();

    const actor = unwrap(await account.select('actor', signal, recover));
    const note = await fabricateNote({
      status: {
        published: new Date('2000-01-01T00:00:00.000Z'),
        actor
      },
      content: '内容',
      attachments: [],
      hashtags: ['名前'],
      mentions: [actor]
    });

    await expect(note.toActivityStreams(signal, recover)).resolves.toEqual({
      type: 'Note',
      published: new Date('2000-01-01T00:00:00.000Z'),
      attributedTo: 'https://AtTrIbUTeDtO.xn--kgbechtv/',
      id: 'https://xn--kgbechtv/@AtTrIbUTeDtO@attributedto.finger.%D8%A5%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1/' + note.id,
      to: 'https://www.w3.org/ns/activitystreams#Public',
      inReplyTo: null,
      summary: null,
      content: '内容',
      attachment: [],
      tag: [
        { type: 'Hashtag', name: '名前' },
        { type: 'Mention', href: 'https://AtTrIbUTeDtO.xn--kgbechtv/' }
      ]
    });

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('create', () => {
  test('creates and returns a note', async () => {
    const published = new Date;
    const recover = jest.fn();
    const attributedTo = await fabricateLocalAccount();
    const attributedToActor =
      unwrap(await attributedTo.select('actor', signal, recover));

    const note = await Note.create(repository, {
      status: { published, actor: attributedToActor, uri: null },
      summary: null,
      content: '内容',
      inReplyTo: { id: null, uri: null },
      attachments: [],
      hashtags: ['名前'],
      mentions: [attributedToActor]
    }, signal, recover);

    const [
      status, hashtags, mentions, ownedStatuses,
      inbox
    ] = await Promise.all([
      note.select('status', signal, recover).then(unwrap),
      note.select('hashtags', signal, recover),
      note.select('mentions', signal, recover),
      repository.selectRecentStatusesIncludingExtensionsByActorId(
        attributedToActor.id, signal, recover),
      attributedTo.select('inbox', signal, recover)
    ]);

    expect(recover).not.toHaveBeenCalled();
    expect(note).toBeInstanceOf(Note);
    expect(status.published).toBe(published);
    expect(status.select('actor', signal, recover)).resolves.toBe(attributedToActor);
    expect(note).toHaveProperty('summary', null);
    expect(note).toHaveProperty('content', '内容');
    expect(hashtags[0]).toHaveProperty('name', '名前');
    expect(mentions[0]).toHaveProperty(['href', 'id'], attributedToActor.id);
    expect(ownedStatuses[0]).toHaveProperty('id', note.id);
    expect(inbox[0]).toHaveProperty('id', note.id);
  });

  test('sanitizes HTML', async () => {
    const attributedTo = await fabricateLocalAccount();
    const recover = jest.fn();

    const note = await Note.create(repository, {
      status: {
        published: new Date,
        actor: unwrap(await attributedTo.select('actor', signal, recover)),
        uri: null
      },
      summary: '要約<script>alert("XSS");</script>',
      content: '内容<script>alert("XSS");</script>',
      inReplyTo: { id: null, uri: null },
      attachments: [],
      hashtags: [],
      mentions: []
    }, signal, recover);

    expect(recover).not.toHaveBeenCalled();
    expect(note).toHaveProperty('content', '内容');
    expect(note).toHaveProperty('summary', '要約');
  });

  test('inserts into inboxes', async () => {
    const recover = jest.fn();
    const actorAccount = await fabricateLocalAccount();
    const actor = unwrap(await actorAccount.select('actor', signal, recover));
    const follow = await fabricateFollow({ actor });
    const object = unwrap(await follow.select('object', signal, recover));

    await Note.create(repository, {
      status: {
        published: new Date,
        actor: object,
        uri: null
      },
      summary: null,
      content: '内容',
      inReplyTo: { id: null, uri: null },
      attachments: [],
      hashtags: [],
      mentions: []
    }, signal, recover);

    expect(recover).not.toHaveBeenCalled();
    expect((await actorAccount.select('inbox', signal, recover))[0])
      .toHaveProperty(['extension', 'content'], '内容');
  });
});

describe('createFromParsedActivityStreams', () => {
  test('creates and returns note from ActivityStreams representation', async () => {
    const recover = jest.fn();
    const [[actor, wrappedObject], mentioned] = await Promise.all([
      fabricateFollow().then(follow => Promise.all([
        follow.select('actor', signal, recover),
        follow.select('object', signal, recover)
      ])),
      fabricateLocalAccount({ actor: { username: 'MeNtIoNeD' } })
    ]);

    const subscribedChannel = repository.getInboxChannel(unwrap(actor));
    let resolveStream: () => void;
    const asyncStream = new Promise(resolve => resolveStream = resolve);

    await repository.subscribe(subscribedChannel, (publishedChannel, message) => {
      const parsed = JSON.parse(message);

      expect(publishedChannel).toBe(subscribedChannel);
      expect(parsed).toHaveProperty('type', 'Note');
      expect(parsed).toHaveProperty('content', '内容');

      resolveStream();
    });

    const object = unwrap(wrappedObject);

    const note = unwrap(await Note.createFromParsedActivityStreams(
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
      }, anyHost),
      object,
      signal,
      recover));

    const [hashtags, mentions, ownedStatuses] = await Promise.all([
      note.select('hashtags', signal, recover),
      note.select('mentions', signal, recover),
      repository.selectRecentStatusesIncludingExtensionsByActorId(
        object.id, signal, recover)
    ]);

    expect(recover).not.toHaveBeenCalled();
    expect(note).toBeInstanceOf(Note);
    expect(note).toHaveProperty(['status', 'actor'], object);
    expect(note).toHaveProperty('content', '内容');
    expect(hashtags[0]).toHaveProperty('name', '名前');
    expect(mentions[0]).toHaveProperty(['href', 'id'], mentioned.id);
    expect(ownedStatuses[0]).toHaveProperty('id', note.id);

    await asyncStream;
  });

  test('infers attribution if attributedTo argument is not given', async () => {
    const recover = jest.fn();
    const account = await fabricateRemoteAccount(
      { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' });

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
      }, anyHost),
      null,
      signal,
      recover)).resolves.toHaveProperty(['status', 'actorId'], account.id);

    expect(recover).not.toHaveBeenCalled();
  });

  test('does not create if to does not include public', async () => {
    const account = await fabricateLocalAccount();
    const recover = jest.fn();

    await expect(Note.createFromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        type: 'Note',
        published: '2000-01-01T00:00:00.000Z',
        to: [],
        content: '内容',
        attachment: [],
        tag: []
      }, anyHost),
      unwrap(await account.select('actor', signal, recover)),
      signal,
      recover)).resolves.toBe(null);

    expect(recover).not.toHaveBeenCalled();
  });

  test('rejects if type is not Note', async () => {
    const recovery = {};

    await fabricateRemoteAccount(
      { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' });

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
      }, anyHost),
      null,
      signal,
      error => {
        expect(error[unexpectedType]).toBe(true);
        return recovery;
      })).rejects.toBe(recovery);
  });

  test('resolves inReplyTo with a local note', async () => {
    const recover = jest.fn();
    const [[inReplyToId, inReplyTo]] = await Promise.all([
      fabricateNote({ status: { uri: null } })
        .then(note => note.select('status', signal, recover))
        .then(unwrap)
        .then(status => Promise.all([
          status.id,
          status.getUri(signal, recover)
        ])),
      fabricateRemoteAccount(
        { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' })
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
      }, anyHost),
      null,
      signal,
      recover)).resolves.toHaveProperty('inReplyToId', inReplyToId);

    expect(recover).not.toHaveBeenCalled();
  });

  test('resolves inReplyTo with a remote note', async () => {
    await fabricateRemoteAccount(
      { uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' });

    const recover = jest.fn();
    const { inReplyToId } = unwrap(await Note.createFromParsedActivityStreams(
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
      }, anyHost),
      null,
      signal,
      recover));

    await expect(repository.selectURIById(unwrap(inReplyToId), signal, recover))
      .resolves
      .toHaveProperty('uri', 'https://iNrEpLyTo.xn--kgbechtv/');

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('fromParsedActivityStreams', () => {
  test('resolves with an existent local note', async () => {
    const recover = jest.fn();
    const account = await fabricateLocalAccount({ actor: { username: '' } });
    const actor = unwrap(await account.select('actor', signal, recover));
    const { id } = await fabricateNote({ status: { actor }, content: '内容' });

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://xn--kgbechtv/@/' + id,
        anyHost),
      null,
      signal,
      recover)).resolves.toHaveProperty('content', '内容');

    expect(recover).not.toHaveBeenCalled();
  });

  test('rejects local URI with incorrect username', async () => {
    const recover = jest.fn();
    const account = await fabricateLocalAccount({ actor: { username: '' } });
    const actor = unwrap(await account.select('actor', signal, recover));
    const note = await fabricateNote({ status: { actor } });
    const recovery = {};

    expect(recover).not.toHaveBeenCalled();

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://xn--kgbechtv/@incorrect/' + note.id,
        anyHost),
      null,
      signal,
      () => recovery)).rejects.toBe(recovery);
  });

  test('resolves with an existent remote note', async () => {
    const recover = jest.fn();

    await fabricateNote({
      status: { uri: 'https://NoTe.xn--kgbechtv/' },
      content: '内容'
    });

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://NoTe.xn--kgbechtv/',
        anyHost),
      null,
      signal,
      recover)).resolves.toHaveProperty('content', '内容');

    expect(recover).not.toHaveBeenCalled();
  });

  test('creates and returns note from ActivityStreams representation', async () => {
    const recover = jest.fn();
    const account = await fabricateLocalAccount();
    const actor = unwrap(await account.select('actor', signal, recover));

    const note = await Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(repository, {
        type: 'Note',
        published: '2000-01-01T00:00:00.000Z',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '',
        attachment: [],
        tag: []
      }, anyHost),
      actor,
      signal,
      recover);

    expect(recover).not.toHaveBeenCalled();
    expect(note).toBeInstanceOf(Note);
    expect(note).toHaveProperty(['status', 'actor'], actor);
  });
});
