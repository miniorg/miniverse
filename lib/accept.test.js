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

import Accept from './accept';
import Follow from './follow';
import LocalAccount from './local_account';
import Person from './person';
import RemoteAccount from './remote_account';
import repository from './test_repository';
const nock = require('nock');

describe('toActivityStreams', () => {
  test('returns ActivityStreams representation', async () => {
    const accept = new Accept({
      object: new Follow({
        actor: new Person({
          account: new LocalAccount({
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
          account: new LocalAccount({
            admin: true,
            privateKeyPem: '',
            salt: '',
            serverKey: '',
            storedKey: ''
          }),
          username: '被行動者',
          host: null
        })
      })
    });

    await Promise.all([
      repository.insertLocalAccount(accept.object.actor.account),
      repository.insertLocalAccount(accept.object.object.account)
    ]);

    await repository.insertFollow(accept.object);
    const { body } = await accept.toActivityStreams(repository);

    return expect(body).resolves.toEqual({
      type: 'Accept',
      object: {
        type: 'Follow',
        actor: 'https://xn--kgbechtv/@%E8%A1%8C%E5%8B%95%E8%80%85',
        object: 'https://xn--kgbechtv/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85'
      }
    });
  });
});

describe('create', () => {
  test('returns a promise which will be resolved with an Accept', async () => {
    const follow = new Follow({
      actor: new Person({
        account: new LocalAccount({ 
          admin: true,
          privateKeyPem: '',
          salt: '',
          serverKey: '',
          storedKey: ''
        }),
        username: 'actor',
        host: null
      }),
      object: new Person({
        account: new LocalAccount({
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

    await Promise.all([
      repository.insertLocalAccount(follow.actor.account),
      repository.insertLocalAccount(follow.object.account)
    ]);

    await repository.insertFollow(follow);

    const accept = await Accept.create(repository, follow);

    expect(accept).toBeInstanceOf(Accept);
    expect(accept.object).toBe(follow);
  });

  describe('if the actor is local', () => {
    async function fabricateFollow() {
      const follow = new Follow({
        actor: new Person({
          account: new RemoteAccount({
            inbox: { uri: 'https://AcToR.إختبار/?inbox' },
            publicKey: { uri: '', publicKeyPem: '' },
            uri: ''
          }),
          username: '行動者',
          host: 'FiNgEr.AcToR.إختبار'
        }),
        object: new Person({
          account: new LocalAccount({
            admin: true,
            privateKeyPem: `-----BEGIN RSA PRIVATE KEY-----
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
`,
            salt: '',
            serverKey: '',
            storedKey: ''
          }),
          username: '被行動者',
          host: null
        })
      });

      await Promise.all([
        repository.insertRemoteAccount(follow.actor.account),
        repository.insertLocalAccount(follow.object.account)
      ]);

      await repository.insertFollow(follow);

      return follow;
    }

    test('delivers to remote object', async () => {
      const follow = await fabricateFollow();

      /*
        Mastodon requires HTTP signature:
        HTTP signatures (#4146) · tootsuite/mastodon@1618b68
        https://github.com/tootsuite/mastodon/commit/1618b68bfa740ed655ac45d7d5f4f46fed6c8c62#diff-5b3d0ae6b9258cbe471d5b2a3a1646a6

        reqheaders ignored · Issue #748 · node-nock/nock
        https://github.com/node-nock/nock/issues/748
      */
      const post = nock('https://AcToR.إختبار')
        .matchHeader('Signature', /keyId="https:\/\/xn--kgbechtv\/@%E8%A2%AB%E8%A1%8C%E5%8B%95%E8%80%85#key",algorithm="rsa-sha256",headers="date",signature=".*"/)
        .matchHeader('User-Agent', repository.userAgent)
        .post('/?inbox')
        .reply(200);

      try {
        await Accept.create(repository, follow);
        expect(post.isDone()).toBe(true);
      } finally {
        nock.cleanAll();
      }
    });

    test('rejects if failed to deliver to remote object', async () => {
      const follow = await fabricateFollow();
      const post = nock('https://AcToR.إختبار')
        .post('/?inbox')
        .replyWithError('');

      try {
        await expect(Accept.create(repository, follow))
          .rejects
          .toBeInstanceOf(Error);

        expect(post.isDone());
      } finally {
        nock.cleanAll();
      }
    });
  });
});
