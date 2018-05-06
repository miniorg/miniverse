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

exports.up = (db, callback) => db.createTable('follows', {
  id: { type: 'int', autoIncrement: true, notNull: true, primaryKey: true },
  actor_id: {
    type: 'int',
    notNull: true,
    foreignKey: {
      name: 'actor_id',
      table: 'persons',
      rules: { onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      mapping: 'id',
    }
  },
  object_id: {
    type: 'int',
    notNull: true,
    foreignKey: {
      name: 'object_id',
      table: 'persons',
      rules: { onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      mapping: 'id',
    }
  }
}, error => {
  if (error) {
    callback(error);
  } else {
    db.addIndex(
      'follows',
      'follows_actor_id_object_id',
      ['actor_id', 'object_id'],
      true,
      callback);
  }
});

exports._meta = { version: 1 };
