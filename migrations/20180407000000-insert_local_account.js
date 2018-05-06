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

exports.up = (db, callback) => db.runSql(`CREATE FUNCTION insert_local_account(username TEXT, admin BOOLEAN, private_key_pem TEXT, salt BYTEA, server_key BYTEA, stored_key BYTEA)
RETURNS INTEGER AS $$
  DECLARE person_id INTEGER;
  BEGIN
    INSERT INTO persons (username, host) VALUES ($1, '') RETURNING id INTO person_id;
    INSERT INTO local_accounts (person_id, admin, private_key_pem, salt, server_key, stored_key) VALUES (person_id, $2, $3, $4, $5, $6);
    RETURN person_id;
  END
$$ LANGUAGE plpgsql`, callback);
