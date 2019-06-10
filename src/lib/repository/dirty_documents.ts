/*
  Copyright (C) 2019  Miniverse authors

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

import DirtyDocument from '../tuples/dirty_document';
import Repository from '.';

export default class {
  async deleteDirtyDocument(this: Repository, { id }: DirtyDocument) {
    await this.pg.query({
      name: 'deleteDirtyDocument',
      text: 'DELETE FROM dirty_documents WHERE id = $1',
      values: [id]
    });
  }

  async insertDirtyDocument(this: Repository, uuid: string, format: string) {
    const { rows } = await this.pg.query({
      name: 'insertDirtyDocument',
      text: 'INSERT INTO dirty_documents (uuid, format) VALUES ($1, $2) RETURNING id',
      values: [uuid, format]
    });

    return new DirtyDocument({ repository: this, id: rows[0].id, uuid, format });
  }
}
