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

exports.up = (db, callback) => db.runSql(`CREATE OR REPLACE FUNCTION insert_announce(
  published timestamp,
  uri varchar,
  actor_id bigint,
  object_id bigint) RETURNS bigint
    LANGUAGE plpgsql AS $_$
  #variable_conflict use_column
  DECLARE announce_id bigint;
  BEGIN
    INSERT INTO statuses (published, actor_id) VALUES ($1, $3)
      RETURNING statuses.id INTO announce_id;

    INSERT INTO announces (id, object_id) VALUES (announce_id, $4);

    IF $2 IS NOT NULL THEN
      INSERT INTO uris (id, uri) VALUES (announce_id, $2)
        ON CONFLICT (uri) DO UPDATE SET id = announce_id;
    END IF;

    RETURN announce_id;
  END
$_$;

CREATE OR REPLACE FUNCTION insert_local_account(
  username varchar,
  name varchar,
  summary text,
  admin boolean,
  private_key_pem text,
  salt bytea,
  server_key bytea,
  stored_key bytea) RETURNS bigint
    LANGUAGE plpgsql AS $_$
  DECLARE id BIGINT;
  BEGIN
    INSERT INTO actors (username, host, name, summary) VALUES ($1, '', $2, $3)
      RETURNING actors.id INTO id;

    INSERT INTO local_accounts
        (id, admin, private_key_pem, salt, server_key, stored_key)
      VALUES (id, $4, $5, $6, $7, $8);

    RETURN id;
  END
$_$;

CREATE OR REPLACE FUNCTION insert_note(
  published timestamp,
  uri varchar,
  attributed_to_id bigint,
  in_reply_to_id bigint,
  in_reply_to text,
  summary text,
  content text,
  hashtag_names varchar[],
  mentions bigint[]) RETURNS record
    LANGUAGE plpgsql AS $_$
  DECLARE hashtag_name varchar;
  DECLARE hashtag_id bigint;
  DECLARE note_id bigint;
  DECLARE result record;
  DECLARE rescued bool;
  BEGIN
    IF $2 IS NULL THEN
      INSERT INTO statuses (published, actor_id) VALUES ($1, $3)
        RETURNING statuses.id INTO note_id;
    ELSE
      rescued := FALSE;

      BEGIN
        INSERT INTO uris (uri) VALUES ($2) RETURNING uris.id INTO note_id;
      EXCEPTION WHEN unique_violation THEN
        UPDATE statuses SET published = $1, actor_id = $3 FROM uris
          WHERE
            statuses.id = uris.id AND statuses.actor_id IS NULL AND
              uris.uri = $2
          RETURNING uris.id INTO note_id;

        IF note_id IS NULL THEN
          RAISE;
        END IF;

        rescued := TRUE;
      END;

      IF NOT rescued THEN
        INSERT INTO statuses (id, published, actor_id)
          VALUES (note_id, $1, $3);
      END IF;
    END IF;

    IF $4 IS NULL AND $5 IS NOT NULL THEN
      rescued := FALSE;

      BEGIN
        INSERT INTO uris (uri) VALUES ($5) RETURNING id INTO in_reply_to_id;
      EXCEPTION WHEN unique_violation THEN
        SELECT INTO in_reply_to_id uris.id FROM uris
          LEFT OUTER JOIN notes
            ON uris.id = notes.id
          LEFT OUTER JOIN notes AS in_reply_tos
            ON uris.id = in_reply_tos.in_reply_to_id
          WHERE
            uris.uri = $5 AND
              (notes.id IS NOT NULL OR in_reply_tos.in_reply_to_id IS NOT NULL);

        rescued := TRUE;
      END;

      IF NOT rescued THEN
        INSERT INTO statuses (id, actor_id) VALUES (in_reply_to_id, NULL);
      END IF;
    END IF;

    INSERT INTO notes (id, in_reply_to_id, summary, content)
      VALUES (note_id, in_reply_to_id, $6, $7);

    FOR hashtag_name IN SELECT unnest FROM unnest($8) LOOP
      rescued := FALSE;

      BEGIN
        INSERT INTO hashtags (name) VALUES (hashtag_name)
          RETURNING id INTO hashtag_id;
      EXCEPTION WHEN unique_violation THEN
        INSERT INTO hashtags_notes (hashtag_id, note_id)
          SELECT id, note_id FROM hashtags WHERE name = hashtag_name;

        rescued := TRUE;
      END;

      IF NOT rescued THEN
        INSERT INTO hashtags_notes (hashtag_id, note_id)
          VALUES (hashtag_id, note_id);
      END IF;
    END LOOP;

    INSERT INTO mentions (note_id, href_id)
      SELECT note_id, unnest FROM unnest($9);

    result := (note_id, in_reply_to_id);
    RETURN result;
  END
$_$;

CREATE OR REPLACE FUNCTION insert_remote_account(
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
    INSERT INTO actors (username, host, name, summary) VALUES ($1, $2, $3, $4)
      RETURNING actors.id INTO account_id;

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

ALTER TABLE persons RENAME TO actors;
ALTER TABLE actors RENAME CONSTRAINT persons_pkey TO actors_pkey;
ALTER TABLE statuses RENAME person_id TO actor_id;
ALTER TABLE statuses
  RENAME CONSTRAINT statuses_person_id_fkey TO statuses_actor_id_fkey;

ALTER INDEX persons_acct RENAME TO actors_acct;
`, callback);

exports._meta = { version: 1 };
