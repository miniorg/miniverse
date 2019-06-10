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
import Resolver from './resolver';
import nock = require('nock');

const { signal } = new AbortController;

async function testLoading(object: unknown, callback: () => Promise<unknown> | unknown) {
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

    const recovery = {};

    expect(object).toHaveProperty('parentContent', content);
    expect(object.getActor(signal, () => recovery)).rejects.toBe(recovery);
  });
});

describe('getActor', () => {
  test('loads and returns actor', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      actor: 'https://ReMoTe.إختبار/actor'
    }, () => expect(object.getActor(signal, recover))
      .resolves
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/actor'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getAttachment', () => {
  test('loads and returns attachment', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      attachment: ['https://ReMoTe.إختبار/attachment']
    }, () =>
      object.getAttachment(signal, recover).then(attachment =>
        expect(unwrap(attachment)[0])
          .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/attachment')));await

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getAttributedTo', () => {
  test('loads and returns attributedTo', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      attributedTo: 'https://ReMoTe.إختبار/attributedTo'
    }, () => expect(object.getAttributedTo(signal, recover))
      .resolves
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/attributedTo'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getContent', () => {
  test('loads and returns content', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      content: '内容'
    }, () => expect(object.getContent(signal, recover)).resolves.toBe('内容'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getContext', () => {
  test('loads string context and returns set', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams'
    }, () => object.getContext(signal, recover).then(context =>
      expect(context.has('https://www.w3.org/ns/activitystreams')).toBe(true)));

    expect(recover).not.toHaveBeenCalled();
  });

  test('loads array context and returns set', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': ['https://www.w3.org/ns/activitystreams']
    }, () => object.getContext(signal, recover).then(context =>
      expect(context.has('https://www.w3.org/ns/activitystreams')).toBe(true)));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getHref', () => {
  test('loads and returns href', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      href: 'https://ReMoTe.إختبار/actor'
    }, () => object.getHref(signal, recover).then(href =>
      expect(href).toBe('https://ReMoTe.إختبار/actor')));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getItems', () => {
  test('loads and returns ordered items of ordered collection', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'OrderedCollection',
      orderedItems: ['https://ReMoTe.إختبار/item']
    }, async () => expect((await object.getItems(signal, recover))[0])
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/item'));

    expect(recover).not.toHaveBeenCalled();
  });

  test('loads and returns items of collection', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Collection',
      items: ['https://ReMoTe.إختبار/item']
    }, async () => expect((await object.getItems(signal, recover))[0])
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/item'));

    expect(recover).not.toHaveBeenCalled();
  });

  test('normalizes and returns itself if it is an array', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository,
      ['https://ReMoTe.إختبار/item'],
      AnyHost);

    await expect((await object.getItems(signal, recover))[0])
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/item');

    expect(recover).not.toHaveBeenCalled();
  });

  test('loads and returns itself if it is not a collection nor an array', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams'
    }, () => object.getItems(signal, recover).then(([loaded]) =>
      expect(unwrap(loaded).content).resolves.toHaveProperty(
        'body', { '@context': 'https://www.w3.org/ns/activitystreams' })));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getId', () => {
  test('resolves id property if an instance of Object is given', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, { id: 'https://ReMoTe.إختبار/' }, AnyHost);

    await expect(object.getId(recover)).resolves.toBe('https://ReMoTe.إختبار/');
    expect(recover).not.toHaveBeenCalled();
  });

  test('resolves itself if string is given', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await expect(object.getId(recover)).resolves.toBe('https://ReMoTe.إختبار/');
    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getInbox', () => {
  test('loads and returns inbox', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      inbox: 'https://ReMoTe.إختبار/inbox',
    }, () => expect(object.getInbox(signal, recover))
      .resolves
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/inbox'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getInReplyTo', () => {
  test('loads and returns inReplyTo', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      inReplyTo: 'https://ReMoTe.إختبار/inReplyTo'
    }, () => expect(object.getInReplyTo(signal, recover))
      .resolves
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/inReplyTo'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getName', () => {
  test('loads and returns name', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      name: '名前',
    }, () => expect(object.getName(signal, recover)).resolves.toBe('名前'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getObject', () => {
  test('loads and returns object', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      object: 'https://ReMoTe.إختبار/object',
    }, () => expect(object.getObject(signal, recover))
      .resolves
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/object'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getOwner', () => {
  test('loads and returns object', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      owner: 'https://ReMoTe.إختبار/owner',
    }, () => expect(object.getOwner(signal, recover))
      .resolves
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/owner'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getPreferredUsername', () => {
  test('loads and returns content', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      preferredUsername: '希望されたユーザー名'
    }, () => expect(object.getPreferredUsername(signal, recover))
      .resolves
      .toBe('希望されたユーザー名'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getPublicKey', () => {
  test('loads and returns public key', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      publicKey: 'https://ReMoTe.إختبار/publickey',
    }, () => expect(object.getPublicKey(signal, recover))
      .resolves
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/publickey'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getPublicKeyPem', () => {
  test('loads and returns public key PEM', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
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
    }, () => expect(object.getPublicKeyPem(signal, recover))
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

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getPublished', () => {
  test('loads and returns published date', () => {
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      published: '2000-01-01T00:00:00.000Z'
    }, async () => {
      const recover = jest.fn();
      const published = unwrap(await object.getPublished(signal, recover));
      expect(recover).not.toHaveBeenCalled();
      expect(published.toISOString()).toBe('2000-01-01T00:00:00.000Z');
    });
  });

  test('loads and returns published date, null', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      published: null
    }, () => expect(object.getPublished(signal, recover)).resolves.toBe(null));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getSummary', () => {
  test('loads and returns content', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      summary: '要約'
    }, () => expect(object.getSummary(signal, recover)).resolves.toBe('要約'));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getTag', () => {
  test('loads and returns tag', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      tag: [{ href: 'https://ReMoTe.إختبار/actor' }]
    }, () => object.getTag(signal, recover).then(tag =>
      expect(unwrap(unwrap(tag)[0]).getHref(signal, recover))
        .resolves
        .toBe('https://ReMoTe.إختبار/actor')));

    expect(recover).not.toHaveBeenCalled();
  });
});

describe('getTo', () => {
  test('loads and returns to in a collection', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      to: ['https://ReMoTe.إختبار/0']
    }, async () => expect(unwrap(unwrap(await object.getTo(signal, recover))[0]).getId(recover))
      .resolves
      .toBe('https://ReMoTe.إختبار/0'));

    expect(recover).not.toHaveBeenCalled();
  });

  test('returns public collection', async () => {
    const recover = jest.fn();
    const object = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      to: 'https://www.w3.org/ns/activitystreams#Public'
    }, async () => expect(unwrap(unwrap(await object.getTo(signal, recover))[0]).getId(recover))
      .resolves
      .toBe('https://www.w3.org/ns/activitystreams#Public'));

    expect(recover).not.toHaveBeenCalled();
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
      const recover = jest.fn();
      const type = await object.getType(signal, recover);

      expect(recover).not.toHaveBeenCalled();
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
      const recover = jest.fn();
      const type = await object.getType(signal, recover);

      expect(recover).not.toHaveBeenCalled();
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
        const recover = jest.fn();
        const link = unwrap(await object.getUrl(signal, recover));
        const [type] = await Promise.all([
          link.getType(signal, recover),
          expect(link.getHref(signal, recover)).resolves.toBe('https://link.إختبار/')
        ]);

        expect(recover).not.toHaveBeenCalled();
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
      { status: { uri: 'https://ReMoTe.إختبار/' } });

    const status = unwrap(await announce.select('status'));
    const actor = unwrap(await status.select('actor'));
    const recover = jest.fn();

    await expect(activity.act(actor, signal, recover))
      .resolves
      .toBe('https://ReMoTe.إختبار/');

    expect(recover).not.toHaveBeenCalled();
  });

  test('performs announce activity', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    const [actor] = await Promise.all([
      fabricateRemoteAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateNote(
        { status: { uri: 'https://NoTe.إختبار/' } })
    ]);

    const recover = jest.fn();

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Announce',
      published: '2000-01-01T00:00:00.000Z',
      id: 'https://ReMoTe.إختبار/',
      to: 'https://www.w3.org/ns/activitystreams#Public',
      object: 'https://NoTe.إختبار/'
    }, () => expect(activity.act(actor, signal, recover))
      .resolves
      .toBe('https://ReMoTe.إختبار/'));

    expect(recover).not.toHaveBeenCalled();
  });

  test('performs create activity', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);
    const account = await fabricateRemoteAccount();
    const actor = unwrap(await account.select('actor'));
    const recover = jest.fn();

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
    }, () => expect(activity.act(actor, signal, recover))
      .resolves
      .toBe('https://ReMoTe.إختبار/NoTe'));

    expect(recover).not.toHaveBeenCalled();
  });

  test('performs delete activity', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    const note = await fabricateNote(
      { status: { uri: 'https://NoTe.إختبار/' } });

    const status = unwrap(await note.select('status'));
    const actor = unwrap(await status.select('actor'));

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Delete',
      object: 'https://NoTe.إختبار/'
    }, async () => {
      const recover = jest.fn();
      await expect(activity.act(actor, signal, recover)).resolves.toBe(null);
      expect(recover).not.toHaveBeenCalled();

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

    const recover = jest.fn();

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Follow',
      object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
    }, () => expect(activity.act(actor, signal, recover)).resolves.toBe(null));

    expect(recover).not.toHaveBeenCalled();
  });

  test('performs like activity', async () => {
    const activity = new ParsedActivityStreams(
      repository, 'https://ReMoTe.إختبار/', AnyHost);

    const [actor] = await Promise.all([
      fabricateLocalAccount()
        .then(account => account.select('actor'))
        .then(unwrap),
      fabricateNote({ status: { uri: 'https://NoTe.إختبار/' } })
    ]);

    const recover = jest.fn();

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Like',
      object: 'https://NoTe.إختبار/'
    }, () => expect(activity.act(actor, signal, recover)).resolves.toBe(null));

    expect(recover).not.toHaveBeenCalled();
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
      const recover = jest.fn();

      await expect(activity.act(actor, signal, recover)).resolves.toBe(null);
      expect(recover).not.toHaveBeenCalled();

      await expect(repository.selectActorsByFolloweeId(object.id))
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

      const recover = jest.fn();

      await testLoading({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Follow',
        actor: 'https://xn--kgbechtv/@%E8%A1%8C%E5%8B%95%E8%80%85',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }, () => expect(activity.act(actor, signal, recover)).resolves.toBe(null));

      expect(recover).not.toHaveBeenCalled();
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

      const recovery = {};

      await testLoading({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Follow',
        actor: 'https://xn--kgbechtv/@%E8%A1%8C%E5%8B%95%E8%80%85',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }, () => expect(activity.act(expectedActor, signal, () => recovery))
        .rejects
        .toBe(recovery));
    });
  });
});
