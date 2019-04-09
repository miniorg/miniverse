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

import { createPrivateKey, generateKeyPair } from 'crypto';
import { join } from 'path';
import { promisify } from 'util';
import Accept from '../tuples/accept';
import Actor from '../tuples/actor';
import Announce from '../tuples/announce';
import Challenge from '../tuples/challenge';
import Cookie from '../tuples/cookie';
import Document from '../tuples/document';
import Follow from '../tuples/follow';
import Hashtag from '../tuples/hashtag';
import Like from '../tuples/like';
import LocalAccount from '../tuples/local_account';
import Note from '../tuples/note';
import Mention from '../tuples/mention';
import RemoteAccount from '../tuples/remote_account';
import Status from '../tuples/status';
import URI from '../tuples/uri';
import repository from './repository';
import { unwrap } from './types';

const privateKeyDer = createPrivateKey(`-----BEGIN RSA PRIVATE KEY-----
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
`).export({ format: 'der', type: 'pkcs1' });

const promisifiedGenerateKeyPair = promisify(generateKeyPair);

let id = 0;

function generateId() {
  id++;
  return id;
}

export async function fabricateAccept(properties) {
  return new Accept(
    Object.assign({ object: await fabricateFollow(), repository }, properties));
}

export async function fabricateAnnounce(properties) {
  const [{ actor }, object] =
    await Promise.all([fabricateLocalAccount(), fabricateNote()]);

  const announce = new Announce(Object.assign({
    repository,
    object
  }, properties, {
    status: new Status(Object.assign(
      { repository, published: new Date, actor },
      properties && properties.status))
  }));

  await repository.insertAnnounce(announce);

  return announce;
}

export async function fabricateChallenge(properties) {
  const challenge = new Challenge(Object.assign(
    { digest: Buffer.from(generateId().toString()) }, properties));

  await repository.insertChallenge(challenge);

  return challenge;
}

export async function fabricateCookie(properties) {
  const cookie = new Cookie(Object.assign({
    account: await fabricateLocalAccount(),
    digest: Buffer.from('digest')
  }, properties));

  await repository.insertCookie(cookie);

  return cookie;
}

export async function fabricateDocument(properties) {
  const document = new Document(Object.assign({
    repository,
    uuid: '00000000-0000-1000-8000-010000000000',
    format: 'js'
  }, properties, {
    url: new URI(Object.assign({
      repository,
      uri: `https://ReMoTe.إختبار/DoCuMeNt/${generateId()}`,
      allocated: true
    }, properties && properties.url))
  }));

  await Promise.all([
    repository.insertDocument(document),
    repository.s3.service.upload({
      Bucket: repository.s3.bucket,
      Body: join(__dirname, __filename),
      Key: `${repository.s3.keyPrefix}${document.uuid}.${document.format}`
    }).promise()
  ]);

  return document;
}

export async function fabricateFollow(properties) {
  const [actor, object] = await Promise.all([
    fabricateLocalAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateLocalAccount()
      .then(account => account.select('actor'))
      .then(unwrap)
  ]);

  const follow = new Follow(Object.assign(
    { repository, actor, object }, properties));

  await repository.insertFollow(follow);

  return follow;
}

export async function fabricateLike(properties) {
  const [actor, object] = await Promise.all([
    fabricateLocalAccount()
      .then(account => account.select('actor'))
      .then(unwrap),
    fabricateNote()
  ]);

  const like = new Like(Object.assign(
    { repository, actor, object }, properties));

  await repository.insertLike(like);

  return like;
}

export async function fabricateLocalAccount(properties) {
  const account = new LocalAccount(Object.assign({
    repository,
    admin: true,
    privateKeyDer,
    salt: '',
    serverKey: '',
    storedKey: ''
  }, properties, {
    actor: new Actor(Object.assign({
      repository,
      username: generateId().toString(),
      host: null,
      name: '',
      summary: ''
    }, properties && properties.actor))
  }));

  await repository.insertLocalAccount(account);

  return account;
}

export async function fabricateNote(properties) {
  const remote = properties && properties.status && (
    (properties.status.actor && properties.status.actor.host) ||
    properties.status.uri);

  const { actor } =
    await (remote ? fabricateRemoteAccount : fabricateLocalAccount)();

  const note = new Note(Object.assign({
    repository,
    summary: null,
    content: ''
  }, properties, {
    status: new Status(Object.assign({
      repository,
      published: new Date,
      actor,
      uri: remote ? new URI(Object.assign({
        repository,
        uri: `https://ReMoTe.إختبار/NoTe/${generateId()}`,
        allocated: true
      }, properties.status.uri)) : null
    }, properties && properties.status)),
    attachments: (properties && properties.attachments) || [],
    hashtags: properties && properties.hashtags ?
      properties.hashtags.map(
        hashtag => new Hashtag(Object.assign({ repository }, hashtag))) :
      [],
    mentions: properties && properties.mentions ?
      properties.mentions.map(
        mention => new Mention(Object.assign({ repository }, mention))) :
      []
  }));

  await repository.insertNote(note);

  return note;
}

export async function fabricateRemoteAccount(properties) {
  const account = new RemoteAccount(Object.assign({
    repository,
    publicKeyDer: (await promisifiedGenerateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { format: 'der', type: 'pkcs1' }
    })).publicKey,
  }, properties, {
    actor: new Actor(Object.assign({
      repository,
      username: generateId().toString(),
      host: 'FiNgEr.ReMoTe.إختبار',
      name: '',
      summary: ''
    }, properties && properties.actor)),
    inboxURI: new URI(Object.assign({
      repository,
      uri: `https://ReMoTe.إختبار/InBoX/${generateId()}`,
      allocated: true
    }, properties && properties.inboxURI)),
    publicKeyURI: new URI(Object.assign({
      repository,
      uri: `https://ReMoTe.إختبار/KeY/${generateId()}`,
      allocated: true
    }, properties && properties.publicKeyURI)),
    uri: new URI(Object.assign({
      repository,
      uri: `https://ReMoTe.إختبار/AcCoUnT/${generateId()}`,
      allocated: true
    }, properties && properties.uri))
  }));

  await repository.insertRemoteAccount(account);

  return account;
}
