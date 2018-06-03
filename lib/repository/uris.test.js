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

import repository from '../test_repository';
import Note from '../note';
import Person from '../person';
import RemoteAccount from '../remote_account';
import URI from '../uri';

describe('deleteURI', () => test('rejects if not found', () =>
  expect(repository.deleteURI('')).rejects.toBeInstanceOf(Error)));

describe('selectURI', () => test('resolves with null if not found', () =>
  expect(repository.selectURI('')).resolves.toBe(null)));

test('inserts note and allows to delete URI', async () => {
  const note = new Note({
    repository,
    attributedTo: new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inbox: { uri: new URI({ repository, uri: '' }) },
        publicKey: { uri: new URI({ repository, uri: '' }), publicKeyPem: '' },
        uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/' })
      }),
      username: '',
      host: 'FiNgEr.ReMoTe.إختبار'
    }),
    content: '内容'
  });

  await repository.insertRemoteAccount(note.attributedTo.account);
  await repository.insertNote(note, 'https://ReMoTe.إختبار/note');

  const uri = await repository.selectURI('https://ReMoTe.إختبار/note');
  await repository.deleteURI(uri);

  await expect(repository.selectURI('https://ReMoTe.إختبار/note'))
    .resolves
    .toBe(null);
});

test('inserts remote account and allows to load the URI of its inbox', async () => {
  const account = new RemoteAccount({
    person: new Person({
      username: '',
      host: 'FiNgEr.ReMoTe.إختبار'
    }),
    inbox: { uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/inbox' }) },
    publicKey: {
      uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/key' }),
      publicKeyPem: ''
    },
    uri: new URI({ repository, uri: '' })
  });

  await repository.insertRemoteAccount(account);

  const uri = new URI({ repository, id: account.inbox.uri.id });
  await repository.loadURI(uri);

  expect(uri).toHaveProperty('uri', 'https://ReMoTe.إختبار/inbox');
});

test('inserts remote account and allows to query the URI of its inbox', async () => {
  const account = new RemoteAccount({
    person: new Person({
      username: '',
      host: 'FiNgEr.ReMoTe.إختبار'
    }),
    inbox: { uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/inbox' }) },
    publicKey: {
      uri: new URI({ repository, uri: 'https://ReMoTe.إختبار/key' }),
      publicKeyPem: ''
    },
    uri: new URI({ repository, uri: '' })
  });

  await repository.insertRemoteAccount(account);

  const uri = await repository.selectURI('https://ReMoTe.إختبار/inbox');

  expect(uri).toHaveProperty('id', account.inbox.uri.id);
  expect(uri).toHaveProperty('uri', 'https://ReMoTe.إختبار/inbox');
});
