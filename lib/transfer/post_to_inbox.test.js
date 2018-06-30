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

import nock from 'nock';
import {
  fabricateLocalAccount,
  fabricateRemoteAccount
} from '../test/fabricator';
import repository from '../test/repository';
import postToInbox from './post_to_inbox';

async function post() {
  const [sender, recipient] = await Promise.all([
    fabricateLocalAccount({ actor: { username: 'SeNdEr' } }),
    fabricateRemoteAccount(
      { inboxURI: { uri: 'https://ReCiPiEnT.إختبار/?inbox' } })
  ]);

  return postToInbox(repository, sender, await recipient.select('inboxURI'), {
    async toActivityStreams() {
      return { type: 'https://example.com/' };
    },
  });
}

test('delivers to remote account', async () => {
  /*
    ActivityPub
    7. Server to Server Interactions
    https://www.w3.org/TR/activitypub/#server-to-server-interactions
    > POST requests (eg. to the inbox) MUST be made with a Content-Type of
    > application/ld+json; profile="https://www.w3.org/ns/activitystreams"

    Mastodon requires HTTP signature:
    HTTP signatures (#4146) · tootsuite/mastodon@1618b68
    https://github.com/tootsuite/mastodon/commit/1618b68bfa740ed655ac45d7d5f4f46fed6c8c62#diff-5b3d0ae6b9258cbe471d5b2a3a1646a6

    reqheaders ignored · Issue #748 · node-nock/nock
    https://github.com/node-nock/nock/issues/748
  */
  const nockPost = nock('https://ReCiPiEnT.إختبار')
    .matchHeader('Content-Type', 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"')
    .matchHeader('Signature', /keyId="https:\/\/xn--kgbechtv\/@SeNdEr#key",algorithm="rsa-sha256",headers="date",signature=".*"/)
    .post('/?inbox', {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'https://example.com/'
    })
    .reply(200);

  try {
    await post();
    expect(nockPost.isDone()).toBe(true);
  } finally {
    nock.cleanAll();
  }
});

test('rejects if failed to deliver to remote object', async () => {
  const nockPost = nock('https://ReCiPiEnT.إختبار')
    .post('/?inbox')
    .replyWithError('');

  try {
    await expect(post()).rejects.toBeInstanceOf(Error);
    expect(nockPost.isDone());
  } finally {
    nock.cleanAll();
  }
});

test('resolves even if response has body', async () => {
  const nockPost = nock('https://ReCiPiEnT.إختبار')
    .post('/?inbox')
    .reply(200, 'body');

  try {
    await post();
    expect(nockPost.isDone()).toBe(true);
  } finally {
    nock.cleanAll();
  }
});
