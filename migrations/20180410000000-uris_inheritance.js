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

exports.up = (db, callback) => db.runSql(`ALTER TABLE notes RENAME TO old_notes;
CREATE TABLE notes (
  attributed_to_id INT NOT NULL REFERENCES persons (id) ON DELETE CASCADE ON UPDATE CASCADE,
  content VARCHAR NOT NULL
) INHERITS (uris);
INSERT INTO notes (uri, attributed_to_id, content) SELECT NULL, attributed_to_id, content FROM old_notes;
DROP TABLE old_notes;

ALTER TABLE remote_accounts RENAME TO old_remote_accounts;
CREATE TABLE remote_accounts (
  inbox_uri VARCHAR NOT NULL,
  key_uri VARCHAR NOT NULL UNIQUE,
  public_key_pem VARCHAR NOT NULL,
  person_id INT NOT NULL PRIMARY KEY REFERENCES persons (id) ON DELETE CASCADE ON UPDATE CASCADE
) INHERITS (uris);
INSERT INTO remote_accounts (uri, inbox_uri, key_uri, public_key_pem, person_id) SELECT uri, inbox_uri, key_uri, public_key_pem, person_id FROM old_remote_accounts;
DROP TABLE old_remote_accounts;
`, callback);

exports._meta = { version: 1 };
