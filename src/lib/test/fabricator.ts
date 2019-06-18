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
import { createPrivateKey, generateKeyPair } from 'crypto';
import { join } from 'path';
import { promisify } from 'util';
import Repository from '../repository';
import Accept from '../tuples/accept';
import Actor from '../tuples/actor';
import DirtyDocument from '../tuples/dirty_document';
import Document from '../tuples/document';
import Follow from '../tuples/follow';
import LocalAccount from '../tuples/local_account';
import Note from '../tuples/note';
import repository from './repository';
import { unwrap } from './types';

const { signal } = new AbortController;

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

interface StatusProperties {
  readonly uri?: null | string;
  readonly actor?: Actor;
  readonly published?: Date;
}

export async function fabricateLocalAccount(properties?: {
  readonly actor?: {
    readonly username?: string;
    readonly host?: null;
    readonly name?: string;
    readonly summary?: string;
  };
  readonly admin?: boolean;
  readonly privateKeyDer?: Buffer;
  readonly salt?: Buffer;
  readonly serverKey?: Buffer;
  readonly storedKey?: Buffer;
}) {
  const recover = jest.fn();
  const account = await repository.insertLocalAccount(Object.assign({
    admin: true,
    privateKeyDer,
    salt: '',
    serverKey: '',
    storedKey: ''
  }, properties, {
    actor: Object.assign({
      username: generateId().toString(),
      name: '',
      summary: ''
    }, properties && properties.actor)
  }), signal, recover);

  expect(recover).not.toHaveBeenCalled();

  return account;
}

export async function fabricateRemoteAccount(properties?: {
  readonly actor?: {
    readonly username?: string;
    readonly host?: string;
    readonly name?: string;
    readonly summary?: string;
  };
  readonly uri?: string;
  readonly inbox?: { readonly uri?: string };
  readonly publicKey?: {
    readonly uri?: string;
    readonly publicKeyDer?: Buffer;
  };
}) {
  const recover = jest.fn();

  const account = await repository.insertRemoteAccount(Object.assign({
    uri: `https://ReMoTe.إختبار/AcCoUnT/${generateId()}`,
  }, properties, {
    actor: Object.assign({
      username: generateId().toString(),
      host: 'FiNgEr.ReMoTe.إختبار',
      name: '',
      summary: ''
    }, properties && properties.actor),
    inbox: Object.assign({
      uri: `https://ReMoTe.إختبار/InBoX/${generateId()}`,
    }, properties && properties.inbox),
    publicKey: Object.assign({
      uri: `https://ReMoTe.إختبار/KeY/${generateId()}`,
      publicKeyDer: (await promisifiedGenerateKeyPair('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { format: 'der', type: 'pkcs1' }
      })).publicKey,
    }, properties && properties.publicKey),
  }), signal, recover);

  expect(recover).not.toHaveBeenCalled();

  return account;
}

export async function fabricateFollow(properties?: {
  readonly actor?: Actor;
  readonly object?: Actor;
}) {
  const recover = jest.fn();
  const [actor, object] = await Promise.all([
    fabricateLocalAccount()
      .then(account => account.select('actor', signal, recover))
      .then(unwrap),
    fabricateLocalAccount()
      .then(account => account.select('actor', signal, recover))
      .then(unwrap)
  ]);

  const follow = await repository.insertFollow(Object.assign(
    { actor, object }, properties), signal, recover);

  expect(recover).not.toHaveBeenCalled();

  return follow;
}

export async function fabricateNote(properties?: {
  readonly status?: StatusProperties;
  readonly inReplyTo?: { id?: string | null; uri?: string | null };
  readonly summary?: string | null;
  readonly content?: string;
  readonly attachments?: Document[];
  readonly hashtags?: string[];
  readonly mentions?: Actor[];
}) {
  const remote = properties && properties.status && (
    (properties.status.actor && properties.status.actor.host) ||
    properties.status.uri);

  const account = await (remote ? fabricateRemoteAccount : fabricateLocalAccount)();

  const recover = jest.fn();
  const note = await repository.insertNote(Object.assign({
    summary: null,
    content: '',
    attachments: [],
    hashtags: [],
    mentions: []
  }, properties, {
    status: Object.assign({
      published: new Date,
      actor: await account.select('actor', signal, recover),
      uri: remote ? `https://ReMoTe.إختبار/NoTe/${generateId()}` : null
    }, properties && properties.status),
    inReplyTo: Object.assign(
      { id: null, uri: null },
      properties && properties.inReplyTo)
  }), signal, recover);

  expect(recover).not.toHaveBeenCalled();

  return note;
}

export async function fabricateAccept(properties?: {
  readonly repository?: Repository;
  readonly object?: Follow;
}) {
  return new Accept(
    Object.assign({ object: await fabricateFollow(), repository }, properties));
}

export async function fabricateAnnounce(properties?: {
  readonly status?: StatusProperties;
  readonly object?: Note;
}) {
  const recover = jest.fn();
  const [actor, object] = await Promise.all([
    fabricateLocalAccount().then(account => account.select('actor', signal, recover)),
    fabricateNote()
  ]);

  const announce = await repository.insertAnnounce(Object.assign({
    object
  }, properties, {
    status: Object.assign(
      { published: new Date, actor, uri: null },
      properties && properties.status)
  }), signal, recover);

  expect(recover).not.toHaveBeenCalled();

  return announce;
}

export function fabricateChallenge() {
  return repository.insertChallenge(Buffer.from(generateId().toString()));
}

export async function fabricateCookie(properties?: {
  readonly account?: LocalAccount;
  readonly digest?: Buffer;
}) {
  const recover = jest.fn();
  const cookie = await repository.insertCookie(Object.assign({
    repository,
    account: await fabricateLocalAccount(),
    digest: Buffer.from('digest')
  }, properties), signal, recover);
  expect(recover).not.toHaveBeenCalled();
  return cookie;
}

export async function fabricateDirtyDocument(
  uuid = '00000000-0000-1000-8000-010000000000',
  format = 'js'
) {
  const recover = jest.fn();
  const dirty =
    await repository.insertDirtyDocument(uuid, format, signal, recover);
  return dirty;
}

export async function fabricateDocument(dirty?: DirtyDocument, url?: string) {
  const recover = jest.fn();

  if (!dirty) {
    dirty = await repository.insertDirtyDocument(
      '00000000-0000-1000-8000-010000000000', 'js', signal, recover);
  }

  if (!url) {
    url = `https://ReMoTe.إختبار/DoCuMeNt/${generateId()}`;
  }

  const [document] = await Promise.all([
    repository.insertDocument(dirty, url, signal, recover),
    repository.s3.service.upload({
      Bucket: repository.s3.bucket,
      Body: join(__dirname, __filename),
      Key: `${repository.s3.keyPrefix}${dirty.uuid}.${dirty.format}`
    }).promise()
  ]);

  expect(recover).not.toHaveBeenCalled();

  return document;
}

export async function fabricateLike(properties?: {
  readonly actor?: Actor;
  readonly object?: Note;
}) {
  const recover = jest.fn();
  const [actor, object] = await Promise.all([
    fabricateLocalAccount()
      .then(account => account.select('actor', signal, recover))
      .then(unwrap),
    fabricateNote()
  ]);

  const like = await repository.insertLike(Object.assign(
    { actor, object }, properties), signal, recover);

  expect(recover).not.toHaveBeenCalled();

  return like;
}
