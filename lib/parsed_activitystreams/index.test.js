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

import {
  fabricateAnnounce,
  fabricateFollow,
  fabricateLocalAccount,
  fabricateNote,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import ParsedActivityStreams, { AnyHost } from './index';
import Resolver, { CircularError } from './resolver';

const nock = require('nock');

async function testLoading(object, callback) {
  const get = nock('https://ReMoTe.إختبار').get('/').reply(200, object);

  try {
    await callback();
    expect(get.isDone()).toBe(true);
  } finally {
    nock.cleanAll();
  }
}

describe('constructor', () => {
  test('sets properties according to given string', () => {
    const object =
      new ParsedActivityStreams(repository, 'https://ReMoTe.إختبار/', AnyHost);

    expect(object).toHaveProperty('referenceId', 'https://ReMoTe.إختبار/');
    expect(object).toHaveProperty('normalizedHost', 'remote.xn--kgbechtv');
    expect(object).toHaveProperty('content', null);
  });

  test('sets properties according to given object', () => {
    const body = { id: 'https://ReMoTe.إختبار/' };
    const object = new ParsedActivityStreams(repository, body, AnyHost);

    expect(object).toHaveProperty('referenceId', null);
    expect(object).toHaveProperty('normalizedHost', 'remote.xn--kgbechtv');
    return expect(object.content).resolves.toHaveProperty('body', body);
  });

  /*
    ActivityPub
    3.1 Object Identifiers
    https://www.w3.org/TR/activitypub/#obj-id
    > An ID explicitly specified as the JSON null object, which implies an
    > anonymous object (a part of its parent context) 
  */
  test('sets properties even if host is not available from given body', () => {
    const body = {};
    const object =
      new ParsedActivityStreams(repository, body, 'remote.xn--kgbechtv');

    expect(object).toHaveProperty('referenceId', null);
    expect(object).toHaveProperty('normalizedHost', 'remote.xn--kgbechtv');
    return expect(object.content).resolves.toHaveProperty('body', body);
  });

  /*
    ActivityPub
    3. Objects
    https://www.w3.org/TR/activitypub/#obj
    >  it should dereference the id both to ensure that it exists and is a valid
    > object, and that it is not misrepresenting the object. (In this example,
    > Mallory could be spoofing an object allegedly posted by Alice).
  */
  test('disposes given properties if id property and normalizedHost option does not match', () => {
    const object = new ParsedActivityStreams(repository, {
      id: 'https://ReMoTe.إختبار/',
      type: 'Add'
    }, 'somewhere.else.xn--kgbechtv');

    expect(object).toHaveProperty('referenceId', 'https://ReMoTe.إختبار/');
    expect(object).toHaveProperty('content', null);
    expect(object).toHaveProperty('normalizedHost', 'remote.xn--kgbechtv');
  });

  test('sets repository', () => {
    const object =
      new ParsedActivityStreams(repository, 'https://ReMoTe.إختبار/', AnyHost);

    expect(object).toHaveProperty('repository', repository);
  });

  test('sets parent content', () => {
    const resolver = new Resolver([['https://ReMoTe.إختبار/', null]]);
    const content = Promise.resolve({ resolver, context: null });
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost, content);

    expect(object).toHaveProperty('parentContent', content);
    expect(object.getActor()).rejects.toBeInstanceOf(CircularError);
  });
});

describe('getActor', () => test('loads and returns actor', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    actor: 'https://ReMoTe.إختبار/actor'
  }, () => expect(object.getActor())
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/actor'));
}));

describe('getAttachment', () => test('loads and returns attachment', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    attachment: ['https://ReMoTe.إختبار/attachment']
  }, () =>
    object.getAttachment().then(attachment =>
      expect(attachment[0])
        .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/attachment')));
}));

describe('getAttributedTo', () => test('loads and returns attributedTo', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    attributedTo: 'https://ReMoTe.إختبار/attributedTo'
  }, () => expect(object.getAttributedTo())
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/attributedTo'));
}));

describe('getContent', () => test('loads and returns content', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    content: '内容'
  }, () => expect(object.getContent()).resolves.toBe('内容'));
}));

describe('getContext', () => {
  test('loads string context and returns set', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams'
    }, () => object.getContext().then(context =>
      expect(context.has('https://www.w3.org/ns/activitystreams')).toBe(true)));
  });

  test('loads array context and returns set', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': ['https://www.w3.org/ns/activitystreams']
    }, () => object.getContext().then(context =>
      expect(context.has('https://www.w3.org/ns/activitystreams')).toBe(true)));
  });
});

describe('getHref', () => test('loads and returns href', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    href: 'https://ReMoTe.إختبار/actor'
  }, () => object.getHref().then(href =>
    expect(href).toBe('https://ReMoTe.إختبار/actor')));
}));

describe('getItems', () => {
  test('loads and returns ordered items of ordered collection', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'OrderedCollection',
      orderedItems: ['https://ReMoTe.إختبار/item']
    }, async () => expect((await object.getItems())[0])
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/item'));
  });

  test('loads and returns items of collection', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Collection',
      items: ['https://ReMoTe.إختبار/item']
    }, async () => expect((await object.getItems())[0])
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/item'));
  });

  test('normalizes and returns itself if it is an array', async () => {
    const object = new ParsedActivityStreams(
      repository,
      ['https://ReMoTe.إختبار/item'],
      AnyHost);

    await expect((await object.getItems())[0])
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/item');
  });

  test('loads and returns itself if it is not a collection nor an array', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams'
    }, () => object.getItems().then(([{ content }]) =>
      expect(content).resolves.toHaveProperty(
        'body', { '@context': 'https://www.w3.org/ns/activitystreams' })));
  });
});

describe('getId', () => {
  test('resolves id property if an instance of Object is given', () => {
    const object = new ParsedActivityStreams(
      repository, { id: 'https://ReMoTe.إختبار/' }, AnyHost);

    expect(object.getId()).resolves.toBe('https://ReMoTe.إختبار/');
  });

  test('resolves itself if string is given', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    expect(object.getId()).resolves.toBe('https://ReMoTe.إختبار/');
  });
});

describe('getInbox', () => test('loads and returns inbox', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    inbox: 'https://ReMoTe.إختبار/inbox',
  }, () => expect(object.getInbox())
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/inbox'));
}));

describe('getInReplyTo', () => test('loads and returns inReplyTo', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    inReplyTo: 'https://ReMoTe.إختبار/inReplyTo'
  }, () => expect(object.getInReplyTo())
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/inReplyTo'));
}));

describe('getName', () => test('loads and returns name', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    name: '名前',
  }, () => expect(object.getName()).resolves.toBe('名前'));
}));

describe('getObject', () => test('loads and returns object', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    object: 'https://ReMoTe.إختبار/object',
  }, () => expect(object.getObject())
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/object'));
}));

describe('getOwner', () => test('loads and returns object', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    owner: 'https://ReMoTe.إختبار/owner',
  }, () => expect(object.getOwner())
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/owner'));
}));

describe('getPreferredUsername', () => test('loads and returns content', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    preferredUsername: '希望されたユーザー名'
  }, () => expect(object.getPreferredUsername())
    .resolves
    .toBe('希望されたユーザー名'));
}));

describe('getPublicKey', () => test('loads and returns public key', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    publicKey: 'https://ReMoTe.إختبار/publickey',
  }, () => expect(object.getPublicKey())
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/publickey'));
}));

describe('getPublicKeyPem',
  () => test('loads and returns public key PEM', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      publicKeyPem: `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`
    }, () => expect(object.getPublicKeyPem())
      .resolves
      .toBe(`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGTrcO6
S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyOiSyF
ZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2/POH
8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ssc1bC
ka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxiB0te
+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQAB
-----END RSA PUBLIC KEY-----
`));
  }));

describe('getPublished', () => {
  test('loads and returns published date', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      published: '2000-01-01T00:00:00.000Z'
    }, async () => {
      const published = await object.getPublished();
      expect(published.toISOString()).toBe('2000-01-01T00:00:00.000Z');
    });
  });

  test('loads and returns published date, null', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      published: null
    }, () => expect(object.getPublished()).resolves.toBe(null));
  });
});

describe('getSummary', () => test('loads and returns content', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    summary: '要約'
  }, () => expect(object.getSummary()).resolves.toBe('要約'));
}));

describe('getTag', () => test('loads and returns tag', () => {
  const object = new ParsedActivityStreams(
    repository, 'https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    tag: [{ href: 'https://ReMoTe.إختبار/actor' }]
  }, () => object.getTag().then(tag =>
    expect(tag[0].getHref()).resolves.toBe('https://ReMoTe.إختبار/actor')));
}));

describe('getTo', () => {
  test('loads and returns to in a collection', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      to: ['https://ReMoTe.إختبار/0']
    }, async () => expect((await object.getTo())[0].getId())
      .resolves
      .toBe('https://ReMoTe.إختبار/0'));
  });

  test('returns public collection', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      to: 'https://www.w3.org/ns/activitystreams#Public'
    }, async () => expect((await object.getTo())[0].getId())
      .resolves
      .toBe('https://www.w3.org/ns/activitystreams#Public'));
  });
});

/*
  Activity Streams 2.0
  4. Model
  https://www.w3.org/TR/activitystreams-core/#model
  4.1 Object
  4.3 Actor
  4.4 Activity
  > When an implementation uses an extension type that overlaps with a core
  > vocabulary type, the implementation MUST also specify the core vocabulary
  > type.
*/
describe('getType', () => {
  test('loads, normalizes an array into a set, and returns it', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: [
        'Add',
        'https://type.إختبار/'
      ]
    }, async () => {
      const type = await object.getType();

      expect(type).toBeInstanceOf(Set);
      expect(Array.from(type)).toEqual(['Add', 'https://type.إختبار/']);
    });
  });

  test('loads, normalizes a string into a set, and returns it', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Add'
    }, async () => {
      const type = await object.getType();

      expect(type).toBeInstanceOf(Set);
      expect(Array.from(type)).toEqual(['Add']);
    });
  });
});

describe('getUrl', () => {
  for (const { description, url } of [
    {
      description: 'resolves Link object',
      url: { type: 'Link', href: 'https://link.إختبار/' }
    },
    {
      description: 'normalizes string to Link object',
      url: 'https://link.إختبار/'
    }
  ]) {
    test(description, async () => {
      const object = new ParsedActivityStreams(
        repository, 'https://ReMoTe.إختبار/', AnyHost);

      return testLoading({
        '@context': 'https://www.w3.org/ns/activitystreams',
        url
      }, async () => {
        const link = await object.getUrl();
        const [type] = await Promise.all([
          link.getType(),
          expect(link.getHref()).resolves.toBe('https://link.إختبار/')
        ]);

        expect(type).toBeInstanceOf(Set);
        expect(Array.from(type)).toEqual(['Link']);
      });
    });
  }
});

describe('act', () => {
  test('resolves known URI', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    const announce = await fabricateAnnounce(
      { status: { uri: { uri: 'https://ReMoTe.إختبار/' } } });

    const status = unwrap(await announce.select('status'));

    await expect(activity.act(unwrap(await status.select('actor'))))
      .resolves
      .toBe('https://ReMoTe.إختبار/');
  });

  test('performs announce activity', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    const [actor] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateNote(
        { status: { uri: { uri: 'https://NoTe.إختبار/' } } })
    ]);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Announce',
      published: '2000-01-01T00:00:00.000Z',
      id: 'https://ReMoTe.إختبار/',
      to: 'https://www.w3.org/ns/activitystreams#Public',
      object: 'https://NoTe.إختبار/'
    }, () => expect(activity.act(actor))
      .resolves
      .toBe('https://ReMoTe.إختبار/'));
  });

  test('performs create activity', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);
    const account = await fabricateRemoteAccount();
    const actor = unwrap(await account.select('actor'));

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Create',
      object: {
        type: 'Note',
        published: '2000-01-01T00:00:00.000Z',
        id: 'https://ReMoTe.إختبار/NoTe',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        content: '',
        attachment: [],
        tag: []
      }
    }, () => expect(activity.act(actor))
      .resolves
      .toBe('https://ReMoTe.إختبار/NoTe'));
  });

  test('performs delete activity', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    const note = await fabricateNote(
      { status: { uri: { uri: 'https://NoTe.إختبار/' } } });

    const status = unwrap(await note.select('status'));
    const actor = unwrap(await status.select('actor'));

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Delete',
      object: 'https://NoTe.إختبار/'
    }, async () => {
      await expect(activity.act(actor)).resolves.toBe(null);

      await expect(repository.selectRecentStatusesIncludingExtensionsByActorId(status.actorId))
        .resolves
        .toEqual([]);
    });
  });

  test('performs follow activity', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    const [actor] = await Promise.all([
      fabricateLocalAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateLocalAccount({ actor: { username: '被行動者' } })
    ]);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Follow',
      object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
    }, () => expect(activity.act(actor)).resolves.toBe(null));
  });

  test('performs like activity', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    const [actor] = await Promise.all([
      fabricateLocalAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateNote({ status: { uri: { uri: 'https://NoTe.إختبار/' } } })
    ]);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Like',
      object: 'https://NoTe.إختبار/'
    }, () => expect(activity.act(actor)).resolves.toBe(null));
  });

  test('performs undo activity', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    const [actor, object] = await Promise.all([
      fabricateLocalAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateLocalAccount({ actor: { username: '被行動者' } })
        .then(account => account.select('actor'))
        .then(unwrap),
    ]);

    await fabricateFollow({ actor, object });

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Undo',
      object: {
        type: 'Follow',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }
    }, async () => {
      await expect(activity.act(actor)).resolves.toBe(null);

      await expect(repository.selectActorsByFolloweeId(unwrap(object.id)))
        .resolves
        .toEqual([]);
    });
  });

  describe('if actor is specified', () => {
    test('accepts if actor matches', async () => {
      const activity = new ParsedActivityStreams(
        repository, 'https://ReMoTe.إختبار/', AnyHost);

      const [actor] = await Promise.all([
        fabricateLocalAccount({ actor: { username: '行動者' } })
          .then(account => account.select('actor'))
          .then(unwrap),
        fabricateLocalAccount({ actor: { username: '被行動者' } })
      ]);

      await testLoading({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Follow',
        actor: 'https://xn--kgbechtv/@%E8%A1%8C%E5%8B%95%E8%80%85',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }, () => expect(activity.act(actor)).resolves.toBe(null));
    });

    test('rejects if actor mismatches', async () => {
      const activity = new ParsedActivityStreams(
        repository, 'https://ReMoTe.إختبار/', AnyHost);

      const [expectedActor] = await Promise.all([
        fabricateLocalAccount()
          .then(account => account.select('actor'))
          .then(unwrap),
        fabricateLocalAccount({ actor: { username: '被行動者' } }),
        fabricateLocalAccount({ actor: { username: '行動者' } })
      ]);

      await testLoading({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Follow',
        actor: 'https://xn--kgbechtv/@%E8%A1%8C%E5%8B%95%E8%80%85',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }, () => expect(activity.act(expectedActor))
        .rejects
        .toBeInstanceOf(Error));
    });
  });
});
