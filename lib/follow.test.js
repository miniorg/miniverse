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
import LocalAccount from './local_account';
import Person from './person';
import RemoteAccount from './remote_account';
import repository from './test_repository';
import URI from './uri';

const privateKeyPem = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Rdj53hR4AdsiRcqt1zdgQHfIIJEmJ01vbALJaZXq951JSGT
rcO6S16XQ3tffCo0QA7G1MOzTeOEJHMiNM4jQQuY0NgDGMs3KEgo0J4ik75VnlyO
iSyFZXCKA/X4vsYZsKyCHGCrbHA6J2m21rbFKj4XChLryn5ZnH6LkdZcaePZwrZ2
/POH8XwTGVMBijGLD/jTLcRlf8LaMRsdRRACZ0bxlxb4Fsk6h5Q1B49HL28QD6Ss
c1bCka4wL4+Pn6kvt+9NH+dYHZAY2elf5rPWDCpOjcVw3lKXKCv0jp9nwU4svGxi
B0te+DHYFaVXQy60WzCEFjiQPZ8XdNQKvDyjKwIDAQABAoIBACCmoGky9sYfIqm9
vmPn0ockva0b6o5SbmPyq6rzcNlb4bsspR0LZXoDiWd2SpDfHk2qgQ4UiVluX+I5
QGwyjHrJztE+Ci3C/hgCPK1nJEsh+8jA91kgZKxUiJjZvkA8OyLFrYO07NAALnSd
I3ogDGXuUDa4ga2bUW8Iq87YRJIcRBNpT91vlUMPGTY/cvEXpSXFvr86ozuTmqAh
Ccp/7WmbQiQEozJJbpJeLbGPiBEF3hP3oBXkKl7GenpseccgtfiZzm4IySnfaNr2
Tc5DcJiw5z6w7lxZE0JIyRJdYTsTTLEP96QddOrI7pfrk/03fcJ1/jVIMdGt6xLv
Qqb6XcECgYEA+wsqKQDJNHCJnjA3MKg6N6wNCUl3I5Fo8p0Vod6sGqZngLrZ8fTP
9t+49kM04E9TBI2J5wb/1nnoLtfkm6tdo9xEM2YDtpDfmdjwWdGqe/QXDVFIT/oK
Oh8iM7TOYnd0l+5VKrHa3VLSgpYpA9Lq4PWRI3n7SLr4nGL6YTEiv9sCgYEA1Tgw
UZ5S+4k+MbzQ8Tz0awTLAaZuULwAMm3B5Pku7SsRefvWYinc0362rBZrq9obkTDQ
efDpM4+sKKSWyT05wig4Ad2608M1AWvBn0H7Unx/HqBK+QlRh1N7CSoaLHM1/cHq
xcPgcjsdKSaUStBIwRZh3+csV4Xb19pPMQRL8vECgYEAnokXb9tyNO6YydAzGkQy
t7Osa9/8H/cVKpmu7pE7aH0Lwgy91AHBT2tLWCFrA/i0OZzUqJQP/rbvvJ1UXkZj
FTblzvuufp2Qx4xrhJ1Wp36nDB73pqIF0VyV8cdNynsbo1K8cADvcXN7Q0Jm1mZd
NAGATcIbwXtpwwDyk2w/QJ8CgYBIjsxymewnSPbvOg/oaBPM716d+yMDOlbe0lbv
MpTzhHp4BmlYEmLhXfeP7DlLy/chm3j2ZjMVpsixNAFUDg+/sKwOhoPzWDSLfT3w
kiWSVmdz5pxczvz9jj0KS1eI1NQEvJ7GGfghJ1ivDj/cjbCUdKdt6F9AkX7Un6ff
SFUIIQKBgBBMvSxRcDCiF5hdV2jVSmFMrdy6mt8kLWZh+vGUu5OOGXIn8xqDeqze
PtM8uICJERUD+p/WiEmEyC3Pd8F7db3zxt34L5BhQ5w2HnPpumDTGNUeuV4byF4z
OyJRYe+sFKZ6lXqnwdWuTrxTNucFuhw+6BVyzNn6lI5cNXLr1reH
-----END RSA PRIVATE KEY-----
`;

async function fabricateFollow(actor, object) {
  const follow = new Follow({ repository, actor, object });
  await repository.insertFollow(follow);
  return follow;
}

async function fabricateLocalActor(username) {
  const actor = new Person({
    repository,
    account: new LocalAccount({
      repository,
      admin: true,
      privateKeyPem,
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username,
    host: null
  });

  await repository.insertLocalAccount(actor.account);

  return actor;
}

async function fabricateLocalObject(username) {
  const object = new Person({
    repository,
    account: new LocalAccount({
      repository,
      admin: true,
      privateKeyPem,
      salt: '',
      serverKey: '',
      storedKey: ''
    }),
    username,
    host: null
  });

  await repository.insertLocalAccount(object.account);

  return object;
}

async function fabricateRemoteActor(username) {
  const actor = new Person({
    repository,
    account: new RemoteAccount({
      repository,
      inboxURI: new URI({ repository, uri: 'https://AcToR.إختبار/inbox' }),
      publicKeyURI: new URI({ repository, uri: 'https://AcToR.إختبار/#publickey' }),
      publicKeyPem: 'public key PEM',
      uri: new URI({ repository, uri: 'https://AcToR.إختبار/' })
    }),
    username,
    host: 'FiNgEr.AcToR.إختبار'
  });

  await repository.insertRemoteAccount(actor.account);

  return actor;
}

async function fabricateRemoteObject(username) {
  const actor = new Person({
    repository,
    account: new RemoteAccount({
      repository,
      inboxURI: new URI({ repository, uri: 'https://ObJeCt.إختبار/inbox' }),
      publicKeyURI: new URI({ repository, uri: 'https://ObJeCt.إختبار/#publickey' }),
      publicKeyPem: 'public key PEM',
      uri: new URI({ repository, uri: 'https://ObJeCt.إختبار/' })
    }),
    username,
    host: 'FiNgEr.ObJeCt.إختبار'
  });

  await repository.insertRemoteAccount(actor.account);

  return actor;
}

describe('toActivityStreams', () =>
  test('loads and returns ActivityStreams representation', async () => {
    const actor = await fabricateLocalActor('行動者');
    const object = await fabricateLocalObject('被行動者');
    const follow = await fabricateFollow(actor, object);
    delete follow.actor;
    delete follow.object;

    await expect(follow.toActivityStreams())
      .resolves
      .toEqual({
        type: 'Follow',
        actor: 'https://xn--kgbechtv/@%E8%A1%8C%E5%8B%95%E8%80%85',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      });
  }));

describe('create', () => {
  test('creates follow', async () => {
    const actor = await fabricateLocalActor('行動者');
    const object = await fabricateLocalObject('被行動者');

    const follow = await Follow.create(repository, actor, object);

    expect(follow).toBeInstanceOf(Follow);
    expect(follow).toHaveProperty('repository', repository);
    expect(follow).toHaveProperty('actor', actor);
    expect(follow).toHaveProperty('object', object);
    expect((await repository.selectPersonsByFolloweeId(object.id))[0])
      .toBeInstanceOf(Person);
  });

  /*
    ActivityPub
    6.5 Follow Activity
    https://www.w3.org/TR/activitypub/#follow-activity-outbox
    > The side effect of receiving this in an outbox is that the server SHOULD
    > add the object to the actor's following Collection when and only if an
    > Accept activity is subsequently received with this Follow activity as its
    > object.
  */
  test('creates accept activity', async () => {
    const actor = await fabricateRemoteActor('行動者');
    const object = await fabricateLocalObject('被行動者');

    await Follow.create(repository, actor, object);

    await expect((await repository.queue.getWaiting())[0])
      .toHaveProperty(['data', 'type'], 'accept');
  });
});

describe('fromParsedActivityStreams', () => {
  test('creates follow from ActivityStreams representation', async () => {
    const actor = await fabricateRemoteActor('行動者');
    const object = await fabricateLocalObject('被行動者');
    const activity = new ParsedActivityStreams(repository, {
      type: 'Follow',

      // See if it accepts IDNA-encoded domain and percent-encoded path.
      object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
    }, AnyHost);

    const follow =
      await Follow.fromParsedActivityStreams(repository, actor, activity);

    expect(follow).toHaveProperty('actor', actor);

    await expect(follow.select('object'))
      .resolves
      .toHaveProperty('id', object.id);
  });

  test('creates follow from ActivityStreams representation given uppercase username', async () => {
    const actor = await fabricateRemoteActor('行動者');
    const object = await fabricateLocalObject('OBJECT');
    const activity = new ParsedActivityStreams(repository, {
      type: 'Follow',
      object: 'https://xn--kgbechtv/@OBJECT'
    }, AnyHost);

    const follow =
      await Follow.fromParsedActivityStreams(repository, actor, activity);

    expect(follow).toHaveProperty('actor', actor);

    await expect(follow.select('object'))
      .resolves
      .toHaveProperty('id', object.id);
  });

  test('posts to remote inbox', async () => {
    const [actor] = await Promise.all([
      fabricateLocalActor('行動者'),
      fabricateRemoteObject('OBJECT')
    ]);

    const activity = new ParsedActivityStreams(repository, {
      type: 'Follow',
      object: 'https://ObJeCt.إختبار/'
    }, AnyHost);

    await expect(Follow.fromParsedActivityStreams(repository, actor, activity))
      .resolves
      .toBeInstanceOf(Follow);

    await expect((await repository.queue.getWaiting())[0])
      .toHaveProperty(['data', 'type'], 'postFollow');
  });
});
