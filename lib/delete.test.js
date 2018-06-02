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

import Delete from './delete';
import ParsedActivityStreams from './parsed_activitystreams';
import RemotePerson from './remote_person';
import Note from './note';
import repository, { AnyHost } from './test_repository';
import URI from './uri';

describe('fromParsedActivityStreams', () => test('deletes note', async () => {
  const attributedTo = new RemotePerson(repository, null, {
    username: '',
    host: '',
    inbox: {
      uri: new URI(repository, null, { uri: 'https://ReMoTe.إختبار/inbox' })
    },
    publicKey: {
      uri: new URI(repository, null, {
        uri: 'https://ReMoTe.إختبار/publickey'
      }),
      publicKeyPem: ''
    },
    uri: 'https://ReMoTe.إختبار/person'
  });

  await repository.insertRemotePerson(attributedTo);

  const note = new Note(repository, null, {
    uri: 'https://ReMoTe.إختبار/',
    attributedTo,
    content: '内容'
  });

  const activityStreams = new ParsedActivityStreams(repository, {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Delete',
    object: 'https://ReMoTe.إختبار/'
  }, AnyHost);

  await repository.insertNote(note);
  await expect(Delete.fromParsedActivityStreams(
    repository, attributedTo, activityStreams)).resolves.toBeInstanceOf(Delete);

  await expect(repository.loadNote(note)).rejects.toBeInstanceOf(Error);
}));
