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

import LocalAccount from './local_account';
import Note from './note';
import Person from './person';
import RemoteAccount from './remote_account';
import Status from './status';
import repository from './test_repository';
import URI from './uri';

describe('getUri', () => {
  test('resolves with local URI', async () => {
    const person = new Person({
      repository,
      account: new LocalAccount({
        repository,
        admin: true,
        privateKeyPem: '',
        salt: '',
        serverKey: '',
        storedKey: ''
      }),
      username: 'attributed to',
      host: null
    });

    await repository.insertLocalAccount(person.account);

    const status = new Status({
      repository,
      extension: new Note({ repository, content: '内容', mentions: [] }),
      person
    });

    await repository.insertNote(status.extension);

    await expect(status.getUri()).resolves.toMatch(/^https:\/\/xn--kgbechtv\/@attributed%20to\//);
  });

  test('resolves with remote URI', async () => {
    const person = new Person({
      repository,
      account: new RemoteAccount({
        repository,
        inboxURI: new URI({ repository, uri: '' }),
        publicKeyURI: new URI({ repository, uri: '' }),
        publicKeyPem: '',
        uri: new URI({ repository, uri: '' })
      }),
      username: 'AtTrIbUTeDtO',
      host: 'AtTrIbUTeDtO.FiNgEr.xn--kgbechtv'
    });

    await repository.insertRemoteAccount(person.account);

    const status = new Status({
      repository,
      extension: new Note({ repository, content: '内容', mentions: [] }),
      person,
      uri: new URI({ repository, uri: 'https://NoTe.xn--kgbechtv/' })
    });

    await repository.insertNote(status.extension);

    await expect(status.getUri()).resolves.toBe('https://NoTe.xn--kgbechtv/');
  });
});
