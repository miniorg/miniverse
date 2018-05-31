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

exports.up = (db, callback) => db.runSql(`ALTER TABLE remote_persons
  ADD inbox_uri_id BIGINT,
  ADD key_uri_id BIGINT UNIQUE;

INSERT INTO uris (uri) SELECT inbox_uri FROM remote_persons GROUP BY inbox_uri;
INSERT INTO uris (uri) SELECT key_uri FROM remote_persons GROUP BY key_uri;

UPDATE remote_persons SET inbox_uri_id = inbox_uris.id, key_uri_id = key_uris.id
  FROM
    uris AS inbox_uris,
    uris AS key_uris
  WHERE
    inbox_uris.uri = remote_persons.inbox_uri AND
    key_uris.uri = remote_persons.key_uri;

ALTER TABLE remote_persons
  ALTER inbox_uri_id SET NOT NULL,
  ALTER key_uri_id SET NOT NULL,
  DROP inbox_uri,
  DROP key_uri;

CREATE FUNCTION insert_remote_person(
  username TEXT, host TEXT, uri TEXT, inbox_uri TEXT,
  key_uri TEXT, public_key_pem TEXT)
RETURNS RECORD AS $$
  DECLARE inbox_uri_id BIGINT;
  DECLARE key_uri_id BIGINT;
  DECLARE id BIGINT;
  BEGIN
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

    INSERT INTO remote_persons (
      username, host, uri, inbox_uri_id,
      key_uri_id, public_key_pem)
        VALUES ($1, $2, $3, inbox_uri_id, key_uri_id, $6)
        RETURNING remote_persons.id INTO id;

    RETURN (id, inbox_uri_id, key_uri_id);
  END
$$ LANGUAGE plpgsql;
`, callback);

exports._meta = { version: 1 };
