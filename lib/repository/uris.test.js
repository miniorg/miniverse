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

import RemotePerson from '../remote_person';
import repository from '../test_repository';
import URI from '../uri';

test('inserts person and allows to query its properties', async () => {
  const person = new RemotePerson(repository, null, {
    username: '',
    host: 'FiNgEr.ReMoTe.xn--kgbechtv',
    inbox: { uri: new URI(repository, null, { uri: '' }) },
    publicKey: {
      uri: new URI(repository, null, { uri: '' }),
      publicKeyPem: ''
    },
    uri: 'https://ReMoTe.إختبار/'
  });

  await repository.insertRemotePerson(person);
  const uriProperties = await repository.loadURI(person);

  expect(uriProperties).toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});

test('inserts person and allows to query by its URI', async () => {
  const person = new RemotePerson(repository, null, {
    username: '',
    host: 'FiNgEr.ReMoTe.xn--kgbechtv',
    inbox: { uri: new URI(repository, null, { uri: '' }) },
    publicKey: {
      uri: new URI(repository, null, { uri: '' }),
      publicKeyPem: ''
    },
    uri: 'https://ReMoTe.إختبار/'
  });

  await repository.insertRemotePerson(person);
  const uri = await repository.selectURI('https://ReMoTe.إختبار/');
  const uriProperties = await uri.get();

  expect(uri).toBeInstanceOf(URI);
  expect(uri).toHaveProperty('repository', repository);
  expect(uri).toHaveProperty('id', person.id);
  expect(uriProperties).toHaveProperty('uri', 'https://ReMoTe.إختبار/');
});
