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
import Follow from './follow';
import Note from './note';
import LocalAccount from './local_account';
import Mention from './mention';
import Person from './person';
import RemoteAccount from './remote_account';
import Status from './status';
import repository from './test_repository';
import URI from './uri';

describe('toActivityStreams', () => {
  test('resolves with ActivityStreams representation of local Note', async () => {
    const person = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'AtTrIbUTeDtO',
      host: null
    });

    await repository.insertLocalAccount(person.account);

    const note = new Note({
      repository,
      status: new Status({ repository, person }),
      content: '内容',
      mentions: [new Mention({ repository, href: person })]
    });

    await repository.insertNote(note);

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
    const person = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: '' }),
        publicKeyURI: new URI({ repository, uri: '' }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: '' })
      }),
      username: 'AtTrIbUTeDtO',
      host: 'AtTrIbUTeDtO.FiNgEr.xn--kgbechtv'
    });

    await repository.insertRemoteAccount(person.account);

    const note = new Note({
      repository,
      status: new Status({ repository, person }),
      content: '内容',
      mentions: [new Mention({ repository, href: person })]
    });

    await repository.insertNote(note);

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
    const attributedTo = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'attributed to',
      host: null
    });

    await repository.insertLocalAccount(attributedTo.account);

    const note = await Note.create(
      repository, null, attributedTo, '内容', [attributedTo]);

    expect(note).toBeInstanceOf(Note);
    expect(note.status.person).toBe(attributedTo);
    expect(note).toHaveProperty('content', '内容');
    expect(note.mentions[0]).toHaveProperty(['href', 'id'], attributedTo.id);
    expect((await repository.selectRecentStatusesIncludingExtensionsByPersonId(attributedTo.id))[0])
      .toHaveProperty('id', note.id);
    expect((await attributedTo.account.select('inbox'))[0])
      .toHaveProperty('id', note.id);
  });

  test('inserts into inboxes of local followers', async () => {
    const actor = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'follower',
      host: null
    });

    const object = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'attributed to',
      host: null
    });

    await Promise.all([
      repository.insertLocalAccount(actor.account),
      repository.insertLocalAccount(object.account)
    ]);

    await repository.insertFollow(new Follow({ actor, object }));
    await Note.create(repository, null, object, '内容', []);

    expect((await actor.account.select('inbox'))[0])
      .toHaveProperty(['extension', 'content'], '内容');
  });

  test('does not insert into local inboxes of remote followers', async () => {
    const actor = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: '' }),
        publicKeyURI: new URI({ repository, uri: '' }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: 'https://FoLlOwEr.إختبار/' })
      }),
      username: 'follower',
      host: 'FiNgEr.FoLlOwEr.xn--kgbechtv'
    });

    const object = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'attributed to',
      host: null
    });

    await Promise.all([
      repository.insertRemoteAccount(actor.account),
      repository.insertLocalAccount(object.account)
    ]);

    await repository.insertFollow(new Follow({ actor, object }));
    await Note.create(repository, null, object, '内容', []);

    await expect(repository.selectRecentStatusesIncludingExtensionsAndPersonsFromInbox(actor.account.id))
      .resolves
      .toHaveProperty('length', 0);
  });

  test('posts note to inboxes of remote followers', async () => {
    const actor = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: '' }),
        publicKeyURI: new URI({ repository, uri: '' }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: 'https://FoLlOwEr.إختبار/' })
      }),
      username: 'follower',
      host: 'FiNgEr.FoLlOwEr.xn--kgbechtv'
    });

    const object = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'attributed to',
      host: null
    });

    await Promise.all([
      repository.insertRemoteAccount(actor.account),
      repository.insertLocalAccount(object.account)
    ]);

    await repository.insertFollow(new Follow({ actor, object }));
    await Note.create(repository, null, object, '内容', []);

    await expect((await repository.queue.getWaiting())[0])
      .toHaveProperty(['data', 'type'], 'postNote')
  });

  test('deduplicates remote inboxes', async () => {
    const actors = [];

    for (let index = 0; index < 2; index++) {
      actors[index] = new Person({
        repository,
        account: new RemoteAccount({
          repository,
          inboxURI: new URI({ repository, uri: '' }),
          publicKeyURI: new URI({
            repository,
            uri: `https://FoLlOwEr.إختبار/${index}#key`
          }),
          publicKeyPem: '',
          uri: new URI({ repository, uri: `https://FoLlOwEr.إختبار/${index}` })
        }),
        username: `follower${index}`,
        host: 'FiNgEr.FoLlOwEr.xn--kgbechtv'
      });

      await repository.insertRemoteAccount(actors[index].account);
    }

    const object = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'attributed to',
      host: null
    });

    await repository.insertLocalAccount(object.account);

    await Promise.all(actors.map(actor =>
      repository.insertFollow(new Follow({ actor, object }))));

    await Note.create(repository, null, object, '内容', []);

    await expect(repository.queue.getWaiting())
      .resolves
      .toHaveProperty('length', 1);
  });

  test('does not post note to inboxes of remote followers if note is remote', async () => {
    const actor = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({
          repository,
          uri: 'https://FoLlOwEr.إختبار/inbox'
        }),
        publicKeyURI: new URI({
          repository,
          uri: 'https://FoLlOwEr.إختبار/key'
        }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: 'https://FoLlOwEr.إختبار/' })
      }),
      username: 'follower',
      host: 'FiNgEr.FoLlOwEr.xn--kgbechtv'
    });

    const object = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({
          repository,
          uri: 'https://AtTrIbUTeDtO.إختبار/inbox'
        }),
        publicKeyURI: new URI({
          repository,
          uri: 'https://AtTrIbUTeDtO.إختبار/key'
        }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: 'https://AtTrIbUTeDtO.إختبار/' })
      }),
      username: 'attributed to',
      host: 'FiNgEr.AtTrIbUTeDtO.xn--kgbechtv'
    });

    await Promise.all([
      repository.insertRemoteAccount(actor.account),
      repository.insertRemoteAccount(object.account)
    ]);

    await repository.insertFollow(new Follow({ actor, object }));
    await Note.create(repository, null, object, '内容', []);

    await expect(repository.queue.getWaiting())
      .resolves
      .toHaveProperty('length', 0);
  });
});

describe('fromParsedActivityStreams', () => {
  test('resolves with an existent local note', async () => {
    const person = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '',
      host: null
    });

    await repository.insertLocalAccount(person.account);

    const note = new Note({
      repository,
      status: new Status({ repository, person }),
      content: '内容',
      mentions: []
    });

    await repository.insertNote(note);

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://xn--kgbechtv/@/' + note.id,
         AnyHost))).resolves.toHaveProperty('content', '内容');
  });

  test('rejects local URI with incorrect username', async () => {
    const person = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '',
      host: null
    });

    await repository.insertLocalAccount(person.account);

    const note = new Note({
      repository,
      status: new Status({ repository, person }),
      content: '内容',
      mentions: []
    });

    await repository.insertNote(note);

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://xn--kgbechtv/@incorrect/' + note.id,
         AnyHost))).rejects.toBeInstanceOf(Error);
  });

  test('resolves with an existent remote note', async () => {
    const person = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: '' }),
        publicKeyURI: new URI({ repository, uri: '' }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: '' })
      }),
      username: 'AtTrIbUTeDtO',
      host: 'AtTrIbUTeDtO.FiNgEr.xn--kgbechtv'
    });

    await repository.insertRemoteAccount(person.account);

    const note = new Note({
      repository,
      status: new Status({
        repository,
        person,
        uri: new URI({ repository, uri: 'https://NoTe.xn--kgbechtv/' })
      }),
      content: '内容',
      mentions: [],
    });

    await repository.insertNote(note);

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        'https://NoTe.xn--kgbechtv/',
         AnyHost))).resolves.toHaveProperty('content', '内容');
  });

  test('creates and returns note from ActivityStreams representation', async () => {
    const follow = new Follow({
      repository,
      actor: new Person({
        repository,
        account: new LocalAccount({
          repository,
          admin: true,
          privateKeyPem: '',
          salt: '',
          serverKey: '',
          storedKey: ''
        }),
        username: '行動者',
        host: null
      }),
      object: new Person({
        repository,
        account: new LocalAccount({
          repository,
          admin: true,
          privateKeyPem: '',
          salt: '',
          serverKey: '',
          storedKey: ''
        }),
        username: '被行動者',
        host: null
      })
    });

    const mentioned = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'MeNtIoNeD',
      host: null
    });

    await Promise.all([
      repository.insertLocalAccount(follow.actor.account),
      repository.insertLocalAccount(follow.object.account),
      repository.insertLocalAccount(mentioned.account)
    ]);

    await repository.insertFollow(follow);

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
    const attributedTo = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: '' }),
        publicKeyURI: new URI({ repository, uri: '' }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: 'https://AtTrIbUTeDtO.xn--kgbechtv/' })
      }),
      username: 'AtTrIbUTeDtO',
      host: 'AtTrIbUTeDtO.FiNgEr.xn--kgbechtv'
    });

    await repository.insertRemoteAccount(attributedTo.account);

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
        .toHaveProperty(['status', 'personId'], attributedTo.id);
  });

  test('does not create if to does not include public', async () => {
    const attributedTo = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: '被行動者',
      host: null
    });

    await repository.insertLocalAccount(attributedTo.account);

    await expect(Note.fromParsedActivityStreams(
      repository,
      new ParsedActivityStreams(
        repository,
        { type: 'Note', to: [], content: '内容', tag: [] },
        AnyHost),
      attributedTo)).resolves.toBe(null);
  });
});
