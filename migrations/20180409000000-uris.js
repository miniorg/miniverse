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

exports.up = (db, callback) => db.runSql(`ALTER SEQUENCE persons_id_seq RENAME TO id_seq;
ALTER SEQUENCE id_seq OWNED BY NONE;

CREATE TABLE uris (
  id BIGINT PRIMARY KEY DEFAULT nextval('id_seq'),
  uri VARCHAR UNIQUE NOT NULL
);

ALTER TABLE persons ALTER id TYPE BIGINT;

ALTER TABLE notes ALTER id SET DEFAULT nextval('id_seq');
DROP SEQUENCE notes_id_seq;

CREATE FUNCTION insert_note_with_uri(
  uri VARCHAR,
  attributed_to_id BIGINT,
  content TEXT
) RETURNS BIGINT AS $$
  DECLARE id BIGINT;
  BEGIN
    INSERT INTO uris (uri) VALUES ($1) RETURNING uris.id INTO id;
    INSERT INTO notes (id, attributed_to_id, content) VALUES (id, $2, $3);
    RETURN id;
  END
$$ LANGUAGE plpgsql;

ALTER TABLE local_accounts ALTER person_id TYPE BIGINT;

DROP FUNCTION insert_local_account(TEXT, BOOLEAN, TEXT, BYTEA, BYTEA, BYTEA);
CREATE FUNCTION insert_local_account(username TEXT, admin BOOLEAN, private_key_pem TEXT, salt BYTEA, server_key BYTEA, stored_key BYTEA)
RETURNS BIGINT AS $$
  DECLARE person_id BIGINT;
  BEGIN
    INSERT INTO persons (username, host) VALUES ($1, '') RETURNING id INTO person_id;
    INSERT INTO local_accounts (person_id, admin, private_key_pem, salt, server_key, stored_key) VALUES (person_id, $2, $3, $4, $5, $6);
    RETURN person_id;
  END
$$ LANGUAGE plpgsql;

ALTER TABLE remote_accounts
  ALTER person_id TYPE BIGINT,
  ADD inbox_uri_id BIGINT
    REFERENCES uris (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD key_uri_id BIGINT
    REFERENCES uris (id) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO uris (uri) SELECT inbox_uri FROM remote_accounts GROUP BY inbox_uri;
INSERT INTO uris (uri) SELECT key_uri FROM remote_accounts GROUP BY key_uri;

UPDATE remote_accounts
  SET inbox_uri_id = inbox_uris.id, key_uri_id = key_uris.id
  FROM uris AS inbox_uris, uris AS key_uris
  WHERE
    inbox_uris.uri = remote_accounts.inbox_uri AND
    key_uris.uri = remote_accounts.key_uri;

ALTER TABLE remote_accounts
  ALTER inbox_uri_id SET NOT NULL,
  ALTER key_uri_id SET NOT NULL,
  DROP inbox_uri,
  DROP key_uri;

DROP FUNCTION insert_remote_account(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION insert_remote_account(
  username TEXT,
  host TEXT,
  uri TEXT,
  inbox_uri TEXT,
  key_uri TEXT,
  public_key_pem TEXT
) RETURNS RECORD AS $$
  DECLARE person_id BIGINT;
  DECLARE inbox_uri_id BIGINT;
  DECLARE key_uri_id BIGINT;
  DECLARE result RECORD;
  BEGIN
    INSERT INTO persons (username, host) VALUES ($1, $2) RETURNING id INTO person_id;

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
      person_id,
      uri,
      inbox_uri_id,
      key_uri_id,
      public_key_pem
    ) VALUES (person_id, $3, inbox_uri_id, key_uri_id, $6);

    result := (person_id, inbox_uri_id, key_uri_id);
    RETURN result;
  END
$$ LANGUAGE plpgsql;
`, callback);

exports._meta = { version: 1 };
