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

import Follow from '../follow';
import LocalAccount from '../local_account';
import Note from '../note';
import Person from '../person';
import repository from '../test_repository';
import ParsedActivityStreams, { AnyHost } from './index';
import Resolver, { CircularError } from './resolver';
const nock = require('nock');

async function fabricatePerson(username) {
  const person = new Person({
    account: new LocalAccount({
      admin: true,
      privateKeyPem: '',
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username,
    host: null
  });

  await repository.insertLocalAccount(person.account);

  return person;
}

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
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

    expect(object).toHaveProperty('referenceId', 'https://ReMoTe.إختبار/');
    expect(object).toHaveProperty('normalizedHost', 'remote.xn--kgbechtv');
    expect(object).toHaveProperty('content', null);
  });

  test('sets properties according to given object', () => {
    const body = { id: 'https://ReMoTe.إختبار/' };
    const object = new ParsedActivityStreams(body, AnyHost);

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
    const object = new ParsedActivityStreams(body, 'remote.xn--kgbechtv');

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
    const object = new ParsedActivityStreams({
      id: 'https://ReMoTe.إختبار/',
      type: 'Add'
    }, 'somewhere.else.xn--kgbechtv');

    expect(object).toHaveProperty('referenceId', 'https://ReMoTe.إختبار/');
    expect(object).toHaveProperty('content', null);
    expect(object).toHaveProperty('normalizedHost', 'remote.xn--kgbechtv');
  });

  test('sets parent content', () => {
    const resolver = new Resolver([['https://ReMoTe.إختبار/', null]]);
    const content = Promise.resolve({ resolver });
    const object = new ParsedActivityStreams(
      'https://ReMoTe.إختبار/', AnyHost, content);

    expect(object).toHaveProperty('parentContent', content);
    expect(object.getActor()).rejects.toBeInstanceOf(CircularError);
  });
});

describe('getActor', () => test('loads and returns actor', () => {
  const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    actor: 'https://ReMoTe.إختبار/actor'
  }, () => expect(object.getActor(repository))
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/actor'));
}));

describe('getAttributedTo', () => test('loads and returns attributedTo', () => {
  const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    attributedTo: 'https://ReMoTe.إختبار/attributedTo'
  }, () => expect(object.getAttributedTo(repository))
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/attributedTo'));
}));

describe('getContent', () => test('loads and returns content', () => {
  const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    content: '内容'
  }, () => expect(object.getContent(repository)).resolves.toBe('内容'));
}));

describe('getContext', () => {
  test('loads string context and returns set', () => {
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams'
    }, () => object.getContext(repository).then(context =>
      expect(context.has('https://www.w3.org/ns/activitystreams')).toBe(true)));
  });

  test('loads array context and returns set', () => {
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': ['https://www.w3.org/ns/activitystreams']
    }, () => object.getContext(repository).then(context =>
      expect(context.has('https://www.w3.org/ns/activitystreams')).toBe(true)));
  });
});

describe('getItems', () => {
  test('loads and returns ordered items of ordered collection', () => {
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'OrderedCollection',
      orderedItems: ['https://ReMoTe.إختبار/item']
    }, async () => expect((await object.getItems(repository))[0])
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/item'));
  });

  test('loads and returns items of collection', () => {
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Collection',
      items: ['https://ReMoTe.إختبار/item']
    }, async () => expect((await object.getItems(repository))[0])
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/item'));
  });

  test('normalizes and returns itself if it is an array', async () => {
    const object = new ParsedActivityStreams(
      ['https://ReMoTe.إختبار/item'],
      AnyHost);

    await expect((await object.getItems(repository))[0])
      .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/item');
  });

  test('loads and returns itself if it is not a collection nor an array', () => {
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams'
    }, () => object.getItems(repository).then(([{ content }]) =>
      expect(content).resolves.toHaveProperty(
        'body', { '@context': 'https://www.w3.org/ns/activitystreams' })));
  });
});

describe('getId', () => {
  test('resolves id property if an instance of Object is given', () => {
    const object = new ParsedActivityStreams(
      { id: 'https://ReMoTe.إختبار/' }, AnyHost);

    expect(object.getId()).resolves.toBe('https://ReMoTe.إختبار/');
  });

  test('resolves itself if string is given', () => {
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);
    expect(object.getId()).resolves.toBe('https://ReMoTe.إختبار/');
  });
});

describe('getInbox', () => test('loads and returns inbox', () => {
  const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    inbox: 'https://ReMoTe.إختبار/inbox',
  }, () => expect(object.getInbox(repository))
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/inbox'));
}));

describe('getObject', () => test('loads and returns object', () => {
  const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    object: 'https://ReMoTe.إختبار/object',
  }, () => expect(object.getObject(repository))
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/object'));
}));

describe('getOwner', () => test('loads and returns object', () => {
  const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    owner: 'https://ReMoTe.إختبار/owner',
  }, () => expect(object.getOwner(repository))
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/owner'));
}));

describe('getPreferredUsername', () => test('loads and returns content', () => {
  const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    preferredUsername: '希望されたユーザー名'
  }, () => expect(object.getPreferredUsername(repository))
    .resolves
    .toBe('希望されたユーザー名'));
}));

describe('getPublicKey', () => test('loads and returns public key', () => {
  const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

  return testLoading({
    '@context': 'https://www.w3.org/ns/activitystreams',
    publicKey: 'https://ReMoTe.إختبار/publickey',
  }, () => expect(object.getPublicKey(repository))
    .resolves
    .toHaveProperty('referenceId', 'https://ReMoTe.إختبار/publickey'));
}));

describe('getPublicKeyPem',
  () => test('loads and returns public key PEM', () => {
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

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
    }, () => expect(object.getPublicKeyPem(repository))
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
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: [
        'Add',
        'https://type.إختبار/'
      ]
    }, async () => {
      const type = await object.getType(repository);

      expect(type).toBeInstanceOf(Set);
      expect(Array.from(type)).toEqual(['Add', 'https://type.إختبار/']);
    });
  });

  test('loads, normalizes a string into a set, and returns it', () => {
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);

    return testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Add'
    }, async () => {
      const type = await object.getType(repository);

      expect(type).toBeInstanceOf(Set);
      expect(Array.from(type)).toEqual(['Add']);
    });
  });
});

describe('act', () => {
  test('performs create activity', async () => {
    const activity = new ParsedActivityStreams(
      'https://ReMoTe.إختبار/', AnyHost);
    const actor = await fabricatePerson('');

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Create',
      object: {
        type: 'Note',
        content: ''
      }
    }, () => activity.act(repository, actor).then(note => {
      expect(note).toBeInstanceOf(Note);
      expect(note.attributedTo.id).toBe(actor.id);
      expect(note.content).toBe('');
    }));
  });

  test('performs follow activity', async () => {
    const activity = new ParsedActivityStreams(
      'https://ReMoTe.إختبار/', AnyHost);

    const [actor, object] = await Promise.all([
      fabricatePerson('行動者'),
      fabricatePerson('被行動者')
    ]);

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Follow',
      object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
    }, () => activity.act(repository, actor).then(follow => {
      expect(follow).toBeInstanceOf(Follow);
      expect(follow.actor.id).toBe(actor.id);
      expect(follow.object.id).toBe(object.id);
    }));
  });

  describe('if actor is specified', () => {
    test('accepts if actor matches', async () => {
      const activity = new ParsedActivityStreams(
        'https://ReMoTe.إختبار/', AnyHost);
      const [actor, object] = await Promise.all([
        fabricatePerson('行動者'),
        fabricatePerson('被行動者')
      ]);

      await testLoading({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Follow',
        actor: 'https://xn--kgbechtv/@%E8%A1%8C%E5%8B%95%E8%80%85',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }, () => activity.act(repository, actor).then(follow => {
        expect(follow).toBeInstanceOf(Follow);
        expect(follow.actor.id).toBe(actor.id);
        expect(follow.object.id).toBe(object.id);
      }));
    });

    test('rejects if actor mismatches', async () => {
      const activity = new ParsedActivityStreams(
        'https://ReMoTe.إختبار/', AnyHost);
      const [expectedActor] = await Promise.all([
        fabricatePerson('仮定された行動者'),
        fabricatePerson('被行動者'),
        fabricatePerson('行動者')
      ]);

      await testLoading({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Follow',
        actor: 'https://xn--kgbechtv/@%E8%A1%8C%E5%8B%95%E8%80%85',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }, () => expect(activity.act(repository, expectedActor))
        .rejects
        .toBeInstanceOf(Error));
    });
  });
});

describe('create', () => {
  test('creates note', async () => {
    const object = new ParsedActivityStreams('https://ReMoTe.إختبار/', AnyHost);
    const attributedTo = await fabricatePerson('');

    await testLoading({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Note',
      content: ''
    }, () => object.create(repository, attributedTo).then(note => {
      expect(note).toBeInstanceOf(Note);
      expect(note.attributedTo.id).toBe(attributedTo.id);
      expect(note.content).toBe('');
    }));
  });

  describe('if attributedTo is specified', () => {
    test('accepts if attributedTo matches', async () => {
      const object = new ParsedActivityStreams(
        'https://ReMoTe.إختبار/', AnyHost);

      const attributedTo = await fabricatePerson('');

      await testLoading({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Note',
        attributedTo: 'https://xn--kgbechtv/@',
        content: ''
      }, () => object.create(repository, attributedTo).then(note => {
        expect(note).toBeInstanceOf(Note);
        expect(note.attributedTo.id).toBe(attributedTo.id);
        expect(note.content).toBe('');
      }));
    });

    test('accepts if attributedTo mismatches', async () => {
      const object = new ParsedActivityStreams(
        'https://ReMoTe.إختبار/', AnyHost);

      const [expectedAttributedTo] = await Promise.all([
        fabricatePerson('仮定された行動者'),
        fabricatePerson('')
      ]);

      await testLoading({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Note',
        attributedTo: 'https://xn--kgbechtv/@',
        content: ''
      }, () => expect(object.create(repository, expectedAttributedTo))
        .rejects
       .toBeInstanceOf(Error));
    });
  });
});
