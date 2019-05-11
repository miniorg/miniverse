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

import Document from '../tuples/document';
import URI from '../tuples/uri';
import Repository from '.';

function parse(this: Repository, { id, uuid, format }: {
  readonly id: string;
  readonly uuid: string;
  readonly format: string;
}) {
  return new Document({ repository: this, id, uuid, format });
}

export default class {
  async insertDocument(this: Repository, document: Document & { readonly url: URI }) {
    const { rows } = await this.pg.query({
      name: 'insertDocument',
      text: 'SELECT insert_document_with_url($1, $2, $3)',
      values: [document.uuid, document.format, document.url.uri]
    });

    document.id = rows[0].insert_document_with_url;
    document.url.id = rows[0].insert_document_with_url;
  }

  async selectDocumentById(this: Repository, id: string): Promise<Document | null> {
    const { rows } = await this.pg.query({
      name: 'selectDocumentById',
      text: 'SELECT * FROM documents WHERE id = $1',
      values: [id]
    });

    return rows[0] ? parse.call(this, rows[0]) : null;
  }

  async selectDocumentsByAttachedNoteId(this: Repository, id: string) {
    const { rows } = await this.pg.query({
      name: 'selectDocumentsByAttachedNoteId',
      text: 'SELECT * FROM documents JOIN attachments ON documents.id = attachments.document_id WHERE attachments.note_id = $1',
      values: [id]
    });

    return (rows as any[]).map(parse, this);
  }
}
