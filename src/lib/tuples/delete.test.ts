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
import ParsedActivityStreams, { AnyHost } from '../parsed_activitystreams';
import {
  fabricateDirtyDocument,
  fabricateDocument,
  fabricateNote
} from '../test/fabricator';
import repository from '../test/repository';
import { unwrap } from '../test/types';
import Delete, { unexpectedType } from './delete';

const { signal } = new AbortController;

describe('createFromParsedActivityStreams', () => {
  test('deletes note', async () => {
    const note = await fabricateNote(
      { status: { uri: 'https://ReMoTe.إختبار/' } });

    const status = unwrap(await note.select('status'));
    const actor = unwrap(await status.select('actor'));
    const recover = jest.fn();
    const activityStreams = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Delete',
      object: 'https://ReMoTe.إختبار/'
    }, AnyHost);

    await expect(Delete.createFromParsedActivityStreams(
      repository, activityStreams, actor, signal, recover)).resolves.toBeInstanceOf(Delete);

    expect(recover).not.toHaveBeenCalled();
    await expect(repository.selectRecentStatusesIncludingExtensionsByActorId(status.actorId))
      .resolves
      .toEqual([]);
  });

  test('deletes attachments', async () => {
    const document = await fabricateDocument(
      await fabricateDirtyDocument(
        '00000000-0000-1000-8000-010000000000', 'png'));
    const note = await fabricateNote({
      attachments: [document],
      status: { uri: 'https://ReMoTe.إختبار/' }
    });

    const status = unwrap(await note.select('status'));
    const actor = unwrap(await status.select('actor'));
    const recover = jest.fn();
    const activityStreams = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Delete',
      object: 'https://ReMoTe.إختبار/'
    }, AnyHost);

    await expect(Delete.createFromParsedActivityStreams(
      repository, activityStreams, actor, signal, recover)).resolves.toBeInstanceOf(Delete);

    expect(recover).not.toHaveBeenCalled();
    await expect(repository.selectDocumentById(document.id)).resolves.toBe(null);
    await expect(repository.selectUnlinkedDocuments()).resolves.toEqual([]);
    await expect(repository.s3.service.headObject({
      Bucket: repository.s3.bucket,
      Key: 'documents/00000000-0000-1000-8000-010000000000.png'
    }).promise()).rejects.toHaveProperty('code', 'NotFound');
  });

  test('rejects if type is not Delete', async () => {
    const note = await fabricateNote(
      { status: {  uri: 'https://ReMoTe.إختبار/' } });

    const recovery = {};
    const status = unwrap(await note.select('status'));
    const activityStreams = new ParsedActivityStreams(repository, {
      '@context': 'https://www.w3.org/ns/activitystreams',
      object: 'https://ReMoTe.إختبار/'
    }, AnyHost);

    await expect(Delete.createFromParsedActivityStreams(
      repository,
      activityStreams,
      unwrap(await status.select('actor')),
      signal,
      error => {
        expect(error[unexpectedType]).toBe(true);
        return recovery;
      })).rejects.toBe(recovery);
  });
});
