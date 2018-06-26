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

exports.up = (db, callback) => db.runSql(`ALTER TABLE persons ADD name varchar;
UPDATE persons SET name = '';
ALTER TABLE persons ALTER name SET NOT NULL;

DROP FUNCTION insert_local_account(
  text, text, boolean, text, bytea, bytea, bytea);

CREATE FUNCTION insert_local_account(
  username varchar,
  name varchar,
  summary text,
  admin boolean,
  private_key_pem text,
  salt bytea,
  server_key bytea,
  stored_key bytea) RETURNS bigint
    LANGUAGE plpgsql
    AS $_$
  DECLARE id BIGINT;
  BEGIN
    INSERT INTO persons (username, host, name, summary) VALUES ($1, '', $2, $3)
      RETURNING persons.id INTO id;

    INSERT INTO local_accounts
        (id, admin, private_key_pem, salt, server_key, stored_key)
      VALUES (id, $4, $5, $6, $7, $8);

    RETURN id;
  END
$_$;

DROP FUNCTION insert_remote_account(text, text, text, text, text, text, text);

CREATE FUNCTION insert_remote_account(
  username varchar,
  host varchar,
  name varchar,
  summary text,
  uri varchar,
  inbox_uri varchar,
  key_uri varchar,
  public_key_pem varchar) RETURNS record
    LANGUAGE plpgsql
    AS $_$
  #variable_conflict use_column
  DECLARE account_id bigint;
  DECLARE inbox_uri_id bigint;
  DECLARE key_uri_id bigint;
  DECLARE result record;
  BEGIN
    INSERT INTO persons (username, host, name, summary) VALUES ($1, $2, $3, $4)
      RETURNING persons.id INTO account_id;

    INSERT INTO uris (id, uri) VALUES (account_id, $5)
      ON CONFLICT (uri) DO UPDATE SET id = account_id;

    SELECT INTO inbox_uri_id uris.id FROM uris
      JOIN remote_accounts ON uris.id = remote_accounts.inbox_uri_id
      WHERE uris.uri = $6;
    IF inbox_uri_id IS NULL
    THEN
      INSERT INTO uris (uri) VALUES ($6)
        ON CONFLICT (uri) DO UPDATE SET id = DEFAULT
        RETURNING uris.id INTO inbox_uri_id;
    END IF;

    INSERT INTO uris (uri) VALUES ($7)
      ON CONFLICT (uri) DO UPDATE SET id = DEFAULT
      RETURNING uris.id INTO key_uri_id;

    INSERT INTO remote_accounts (
      id,
      inbox_uri_id,
      key_uri_id,
      public_key_pem
    ) VALUES (account_id, inbox_uri_id, key_uri_id, $8);

    result := (account_id, inbox_uri_id, key_uri_id);
    RETURN result;
  END
$_$;
`, callback);

exports._meta = { version: 1 };
