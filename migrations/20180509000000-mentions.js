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

exports.up = (db, callback) => db.createTable('mentions', {
  note_id: {
    type: 'bigint',
     notNull: true,
    foreignKey: {
      name: 'note_id',
      table: 'notes',
      rules: { onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      mapping: 'id',
    }
  },
  href_id: {
    type: 'bigint',
    notNull: true,
    foreignKey: {
      name: 'href_id',
      table: 'persons',
      rules: { onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      mapping: 'id',
    }
  }
}, callback);
