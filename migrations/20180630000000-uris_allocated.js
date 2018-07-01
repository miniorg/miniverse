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

exports.up = (db, callback) => db.runSql(`ALTER TABLE uris ADD allocated boolean;

UPDATE uris SET allocated = uris.id NOT IN (SELECT statuses.id
  FROM statuses
  LEFT OUTER JOIN announces ON statuses.id = announces.id
  LEFT OUTER JOIN notes ON statuses.id = notes.id
  WHERE announces.id IS NULL AND notes.id IS NULL);

ALTER TABLE uris ALTER allocated SET NOT NULL;
ALTER TABLE notes DROP CONSTRAINT notes_in_reply_to_id_fkey;

DELETE FROM statuses USING uris WHERE NOT uris.allocated;
UPDATE statuses SET published = '2018-06-25 09:00:29';
ALTER TABLE statuses ALTER actor_id SET NOT NULL, ALTER published SET NOT NULL;

CREATE OR REPLACE FUNCTION insert_announce(
  published timestamp,
  uri varchar,
  actor_id bigint,
  object_id bigint) RETURNS bigint
    LANGUAGE plpgsql AS $_$
  #variable_conflict use_column
  DECLARE announce_id bigint;
  BEGIN
    IF $2 IS NULL THEN
      INSERT INTO statuses (published, actor_id) VALUES ($1, $3)
        RETURNING id INTO announce_id;
    ELSE
      INSERT INTO uris (uri, allocated) VALUES ($2, TRUE)
        ON CONFLICT (uri)
          DO UPDATE SET allocated = TRUE WHERE NOT uris.allocated
        RETURNING id INTO announce_id;

      INSERT INTO statuses (id, published, actor_id)
        VALUES (announce_id, $1, $3);
    END IF;

    INSERT INTO announces (id, object_id) VALUES (announce_id, $4);

    RETURN announce_id;
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
  #variable_conflict use_column
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
      INSERT INTO uris (uri, allocated) VALUES ($2, TRUE)
        ON CONFLICT (uri)
          DO UPDATE SET allocated = TRUE WHERE NOT uris.allocated
        RETURNING id INTO note_id;

      INSERT INTO statuses (id, published, actor_id) VALUES (note_id, $1, $3);
    END IF;

    IF $4 IS NULL AND $5 IS NOT NULL THEN
      BEGIN
        INSERT INTO uris (uri, allocated) VALUES ($5, FALSE)
          RETURNING id INTO in_reply_to_id;
      EXCEPTION WHEN unique_violation THEN
        SELECT INTO in_reply_to_id id FROM uris WHERE uris.uri = $5;
      END;
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
      public_key_pem
    ) VALUES (account_id, inbox_uri_id, key_uri_id, $8);

    result := (account_id, inbox_uri_id, key_uri_id);
    RETURN result;
  END
$_$;
`, callback);

exports._meta = { version: 1 };
