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

exports.up = (db, callback) => db.runSql(`ALTER TABLE remote_accounts RENAME person_id TO id;
INSERT INTO uris (id, uri) SELECT id, uri FROM remote_accounts;
ALTER TABLE remote_accounts DROP uri;

CREATE OR REPLACE FUNCTION insert_remote_account(
  username TEXT,
  host TEXT,
  uri TEXT,
  inbox_uri TEXT,
  key_uri TEXT,
  public_key_pem TEXT
) RETURNS RECORD AS $$
  DECLARE id BIGINT;
  DECLARE inbox_uri_id BIGINT;
  DECLARE key_uri_id BIGINT;
  DECLARE result RECORD;
  BEGIN
    INSERT INTO persons (username, host) VALUES ($1, $2)
      RETURNING persons.id INTO id;

    INSERT INTO uris (id, uri) VALUES (id, $3);

    SELECT INTO inbox_uri_id uris.id FROM uris WHERE uris.uri = $4;
    IF inbox_uri_id IS NULL
    THEN
      INSERT INTO uris (uri) VALUES ($4) RETURNING uris.id INTO inbox_uri_id;
    END IF;

    SELECT INTO key_uri_id uris.id FROM uris WHERE uris.uri = $5;
    IF key_uri_id IS NULL
    THEN
      INSERT INTO uris (uri) VALUES ($5) RETURNING uris.id INTO key_uri_id;
    END IF;

    INSERT INTO remote_accounts (
      id,
      inbox_uri_id,
      key_uri_id,
      public_key_pem
    ) VALUES (id, inbox_uri_id, key_uri_id, $6);

    result := (id, inbox_uri_id, key_uri_id);
    RETURN result;
  END
$$ LANGUAGE plpgsql;
`, callback);
