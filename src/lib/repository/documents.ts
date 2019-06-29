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

import { AbortSignal } from 'abort-controller';
import DirtyDocument from '../tuples/dirty_document';
import Document from '../tuples/document';
import URI from '../tuples/uri';
import Repository, { conflict } from '.';

function parse(this: Repository, { id, uuid, format }: {
  readonly id: string;
  readonly uuid: string;
  readonly format: string;
}) {
  return new Document({ repository: this, id, uuid, format });
}

export default class {
  async insertDocumentWithUrl(
    this: Repository,
    dirty: DirtyDocument,
    url: string,
    signal: AbortSignal,
    recover: (error: Error & { name?: string; [conflict]?: boolean }) => unknown
  ) {
    const { rows: [{ insert_document_with_url: id }] } = await this.pg.query({
      name: 'insertDocumentWithUrl',
      text: 'SELECT insert_document_with_url($1, $2)',
      values: [dirty.id, url]
    }, signal, error => {
      if (error.name == 'AbortError') {
        return recover(error);
      }

      if (error.code == '23502') {
        return recover(Object.assign(
          new Error('uri conflicts.'),
          { [conflict]: true }));
      }

      return error;
    });

    return new Document({
      repository: this,
      id,
      uuid: dirty.uuid,
      format: dirty.format,
      url: new URI({
        repository: this,
        id,
        uri: url,
        allocated: true
      }),
    });
  }

  async insertDocumentWithoutUrl(
    this: Repository,
    dirty: DirtyDocument,
    signal: AbortSignal,
    recover: (error: Error & { name?: string; [conflict]?: boolean }) => unknown
  ) {
    const { rows: [{ insert_document_without_url: id }] } = await this.pg.query({
      name: 'insertDocumentWithoutUrl',
      text: 'SELECT insert_document_without_url($1)',
      values: [dirty.id]
    }, signal, error => error.name == 'AbortError' ? recover(error) : error);

    return new Document({
      repository: this,
      id,
      uuid: dirty.uuid,
      format: dirty.format,
      url: null,
    });
  }

  async selectDocumentById(
    this: Repository,
    id: string,
    signal: AbortSignal,
    recover: (error: Error & { name: string }) => unknown
  ) {
    const { rows } = await this.pg.query({
      name: 'selectDocumentById',
      text: 'SELECT * FROM documents WHERE id = $1',
      values: [id]
    }, signal, recover);

    return rows[0] ? parse.call(this, rows[0]) : null;
  }

  async selectDocumentByUUIDAndFormat(
    this: Repository,
    uuid: string,
    format: string,
    signal: AbortSignal,
    recover: (error: Error & { name: string }) => unknown
  ) {
    const { rows } = await this.pg.query({
      name: 'selectDocumentByUUIDAndFormat',
      text: 'SELECT * FROM documents WHERE uuid = $1 AND format = $2',
      values: [uuid, format]
    }, signal, recover);

    return rows[0] ? parse.call(this, rows[0]) : null;
  }

  async selectDocumentsByAttachedNoteId(
    this: Repository,
    id: string,
    signal: AbortSignal,
    recover: (error: Error & { name: string }) => unknown
  ) {
    const { rows } = await this.pg.query({
      name: 'selectDocumentsByAttachedNoteId',
      text: 'SELECT * FROM documents JOIN attachments ON documents.id = attachments.document_id WHERE attachments.note_id = $1',
      values: [id]
    }, signal, recover);

    return (rows as any[]).map(parse, this);
  }
}
