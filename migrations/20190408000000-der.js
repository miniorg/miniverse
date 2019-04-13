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

const { createPrivateKey, createPublicKey } = require('crypto');

exports.up = async db => {
  const locals = await db.all('SELECT id, private_key_pem FROM local_accounts');
  const remotes = await db.all('SELECT id, public_key_pem FROM remote_accounts');

  await db.runSql(`ALTER TABLE local_accounts ADD private_key_der BYTEA;
ALTER TABLE remote_accounts ADD public_key_der BYTEA;

DROP FUNCTION insert_local_account(
  varchar,
  varchar,
  text,
  boolean,
  text,
  bytea,
  bytea,
  bytea);

CREATE FUNCTION insert_local_account(
  username varchar,
  name varchar,
  summary text,
  admin boolean,
  private_key_der bytea,
  salt bytea,
  server_key bytea,
  stored_key bytea) RETURNS bigint
    LANGUAGE plpgsql AS $_$
  DECLARE id BIGINT;
  BEGIN
    INSERT INTO actors (username, host, name, summary) VALUES ($1, '', $2, $3)
      RETURNING actors.id INTO id;

    INSERT INTO local_accounts
        (id, admin, private_key_der, salt, server_key, stored_key)
      VALUES (id, $4, $5, $6, $7, $8);

    RETURN id;
  END
$_$;

DROP FUNCTION insert_remote_account(
  varchar,
  varchar,
  varchar,
  text,
  varchar,
  varchar,
  varchar,
  varchar);

CREATE FUNCTION insert_remote_account(
  username varchar,
  host varchar,
  name varchar,
  summary text,
  uri varchar,
  inbox_uri varchar,
  key_uri varchar,
  public_key_der bytea) RETURNS record
    LANGUAGE plpgsql
    AS $_$
  #variable_conflict use_column
  DECLARE account_id bigint;
  DECLARE inbox_uri_id bigint;
  DECLARE key_uri_id bigint;
  DECLARE result record;
  BEGIN
    INSERT INTO uris (uri, allocated) VALUES ($5, TRUE)
      ON CONFLICT (uri) DO UPDATE SET allocated = TRUE WHERE NOT uris.allocated
      RETURNING id INTO account_id;

    INSERT INTO actors (id, username, host, name, summary)
      VALUES (account_id, $1, $2, $3, $4);

    SELECT INTO inbox_uri_id uris.id FROM uris
      JOIN remote_accounts ON uris.id = remote_accounts.inbox_uri_id
      WHERE uris.uri = $6;
    IF inbox_uri_id IS NULL
    THEN
      INSERT INTO uris (uri, allocated) VALUES ($6, TRUE)
        ON CONFLICT (uri)
          DO UPDATE SET allocated = TRUE WHERE NOT uris.allocated
        RETURNING id INTO inbox_uri_id;
    END IF;

    INSERT INTO uris (uri, allocated) VALUES ($7, TRUE)
      ON CONFLICT (uri) DO UPDATE SET allocated = TRUE WHERE NOT uris.allocated
      RETURNING id INTO key_uri_id;

    INSERT INTO remote_accounts (
      id,
      inbox_uri_id,
      key_uri_id,
      public_key_der
    ) VALUES (account_id, inbox_uri_id, key_uri_id, $8);

    result := (account_id, inbox_uri_id, key_uri_id);
    RETURN result;
  END
$_$;

ALTER TABLE local_accounts DROP COLUMN private_key_pem;
ALTER TABLE remote_accounts DROP COLUMN public_key_pem;`);

  await db.runSql('UPDATE local_accounts SET private_key_der = given_private_key_der.element FROM unnest($1::bigint[]) WITH ORDINALITY AS given_id(element, index), unnest($2::bytea[]) WITH ORDINALITY AS given_private_key_der(element, index) WHERE local_accounts.id = given_id.element AND given_id.index = given_private_key_der.index', [
    locals.map(({ id }) => id),
    locals.map(({ private_key_pem }) =>
      createPrivateKey(private_key_pem)
        .export({ format: 'der', type: 'pkcs1' })),
  ]);

  await db.runSql('UPDATE remote_accounts SET public_key_der = given_public_key_der.element FROM unnest($1::bigint[]) WITH ORDINALITY AS given_id(element, index), unnest($2::bytea[]) WITH ORDINALITY AS given_public_key_der(element, index) WHERE remote_accounts.id = given_id.element AND given_id.index = given_public_key_der.index', [
    remotes.map(({ id }) => id),
    remotes.map(({ public_key_pem }) =>
      createPublicKey(public_key_pem)
        .export({ format: 'der', type: 'pkcs1' }))
  ]);

  await db.runSql(`ALTER TABLE local_accounts ALTER private_key_der SET NOT NULL;
ALTER TABLE remote_accounts ALTER public_key_der SET NOT NULL;`);
};

exports._meta = { version: 1 };
