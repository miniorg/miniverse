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

exports.up = (db, callback) => db.runSql(`ALTER TABLE announces
  DROP CONSTRAINT announces_id_fkey,
  ADD CONSTRAINT announces_id_fkey FOREIGN KEY (id) REFERENCES statuses (id)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  DROP CONSTRAINT announces_object_id_fkey,
  ADD CONSTRAINT announces_object_id_fkey FOREIGN KEY (object_id)
    REFERENCES notes (id) ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE cookies
  ADD CONSTRAINT cookies_account_id_fkey FOREIGN KEY (account_id)
    REFERENCES local_accounts (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  DROP CONSTRAINT account_id;

ALTER TABLE follows
  ADD CONSTRAINT follows_actor_id_fkey FOREIGN KEY (actor_id)
    REFERENCES persons (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  ADD CONSTRAINT follows_object_id_fkey FOREIGN KEY (object_id)
    REFERENCES persons (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  DROP CONSTRAINT actor_id,
  DROP CONSTRAINT object_id;

ALTER TABLE likes
  DROP CONSTRAINT likes_actor_id_fkey,
  ADD CONSTRAINT likes_actor_id_fkey FOREIGN KEY (actor_id)
    REFERENCES persons (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  DROP CONSTRAINT likes_object_id_fkey,
  ADD CONSTRAINT likes_object_id_fkey FOREIGN KEY (object_id)
    REFERENCES notes (id) ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE local_accounts
  ADD CONSTRAINT local_accounts_id_fkey FOREIGN KEY (id) REFERENCES persons (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  DROP CONSTRAINT person_id;

ALTER TABLE mentions
  ADD CONSTRAINT mentions_note_id_fkey FOREIGN KEY (note_id)
    REFERENCES notes (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  ADD CONSTRAINT mentions_href_id_fkey FOREIGN KEY (href_id)
    REFERENCES persons (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  DROP CONSTRAINT note_id,
  DROP CONSTRAINT href_id;

ALTER TABLE notes
  ADD in_reply_to_id bigint REFERENCES statuses (id)
    ON DELETE SET NULL ON UPDATE SET NULL,
  ADD CONSTRAINT notes_id_fkey FOREIGN KEY (id) REFERENCES statuses (id)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  DROP CONSTRAINT id;

ALTER TABLE remote_accounts
  ADD CONSTRAINT remote_accounts_id_fkey FOREIGN KEY (id)
    REFERENCES persons (id) ON DELETE CASCADE ON UPDATE CASCADE,
  DROP CONSTRAINT remote_accounts_inbox_uri_id_fkey,
  ADD CONSTRAINT remote_accounts_inbox_uri_id_fkey FOREIGN KEY (inbox_uri_id)
    REFERENCES uris (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  DROP CONSTRAINT remote_accounts_key_uri_id_fkey,
  ADD CONSTRAINT remote_accounts_key_uri_id_fkey FOREIGN KEY (key_uri_id)
    REFERENCES uris (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  DROP CONSTRAINT person_id;

ALTER TABLE statuses
  DROP CONSTRAINT statuses_person_id_fkey,
  ADD CONSTRAINT statuses_person_id_fkey FOREIGN KEY (person_id)
    REFERENCES persons (id) ON DELETE CASCADE ON UPDATE RESTRICT;

CREATE OR REPLACE FUNCTION insert_announce(
  uri varchar,
  actor_id bigint,
  object_id bigint) RETURNS bigint
    LANGUAGE plpgsql AS $_$
  #variable_conflict use_column
  DECLARE announce_id bigint;
  BEGIN
    INSERT INTO statuses (person_id) VALUES ($2)
      RETURNING statuses.id INTO announce_id;

    INSERT INTO announces (id, object_id) VALUES (announce_id, $3);

    IF $1 IS NOT NULL THEN
      INSERT INTO uris (id, uri) VALUES (announce_id, $1)
        ON CONFLICT (uri) DO UPDATE SET id = announce_id;
    END IF;

    RETURN announce_id;
  END
$_$;

DROP FUNCTION insert_note(varchar, bigint, text, text, bigint[]);

CREATE FUNCTION insert_note(
  uri varchar,
  attributed_to_id bigint,
  in_reply_to_id bigint,
  in_reply_to text,
  summary text,
  content text,
  mentions bigint[]) RETURNS record
    LANGUAGE plpgsql AS $_$
  #variable_conflict use_column
  DECLARE id bigint;
  DECLARE result record;
  DECLARE rescued BOOL;
  BEGIN
    IF $1 IS NULL THEN
      INSERT INTO statuses (person_id) VALUES ($2)
        RETURNING statuses.id INTO id;
    ELSE
      rescued := FALSE;

      BEGIN
        INSERT INTO uris (uri) VALUES ($1) RETURNING uris.id INTO id;
      EXCEPTION WHEN unique_violation THEN
        UPDATE statuses SET person_id = $2 FROM uris
          WHERE
            statuses.id = uris.id AND statuses.person_id IS NULL AND
              uris.uri = $1
          RETURNING uris.id INTO id;

        IF id IS NULL THEN
          RAISE;
        END IF;

        rescued := TRUE;
      END;

      IF NOT rescued THEN
        INSERT INTO statuses (id, person_id) VALUES (id, $2);
      END IF;
    END IF;

    IF $3 IS NULL AND $4 IS NOT NULL THEN
      rescued := FALSE;

      BEGIN
        INSERT INTO uris (uri) VALUES ($4) RETURNING id INTO in_reply_to_id;
      EXCEPTION WHEN unique_violation THEN
        SELECT INTO in_reply_to_id uris.id FROM uris
          LEFT OUTER JOIN notes
            ON uris.id = notes.id
          LEFT OUTER JOIN notes AS in_reply_tos
            ON uris.id = in_reply_tos.in_reply_to_id
          WHERE
            uris.uri = $4 AND
              (notes.id IS NOT NULL OR in_reply_tos.in_reply_to_id IS NOT NULL);

        rescued := TRUE;
      END;

      IF NOT rescued THEN
        INSERT INTO statuses (id, person_id) VALUES (in_reply_to_id, NULL);
      END IF;
    END IF;

    INSERT INTO notes (id, in_reply_to_id, summary, content)
      VALUES (id, in_reply_to_id, $5, $6);

    INSERT INTO mentions (note_id, href_id) SELECT id, unnest FROM unnest($7);

    result := (id, in_reply_to_id);
    RETURN result;
  END
$_$;

CREATE OR REPLACE FUNCTION insert_remote_account(
  username text,
  host text,
  uri text,
  inbox_uri text,
  key_uri text,
  public_key_pem text) RETURNS record
    LANGUAGE plpgsql
    AS $_$
  #variable_conflict use_column
  DECLARE account_id bigint;
  DECLARE inbox_uri_id bigint;
  DECLARE key_uri_id bigint;
  DECLARE result record;
  BEGIN
    INSERT INTO persons (username, host) VALUES ($1, $2)
      RETURNING persons.id INTO account_id;

    INSERT INTO uris (id, uri) VALUES (account_id, $3)
      ON CONFLICT (uri) DO UPDATE SET id = account_id;

    SELECT INTO inbox_uri_id uris.id FROM uris
      JOIN remote_accounts ON uris.id = remote_accounts.inbox_uri_id
      WHERE uris.uri = $4;
    IF inbox_uri_id IS NULL
    THEN
      INSERT INTO uris (uri) VALUES ($4)
        ON CONFLICT (uri) DO UPDATE SET id = DEFAULT
        RETURNING uris.id INTO inbox_uri_id;
    END IF;

    INSERT INTO uris (uri) VALUES ($5)
      ON CONFLICT (uri) DO UPDATE SET id = DEFAULT
      RETURNING uris.id INTO key_uri_id;

    INSERT INTO remote_accounts (
      id,
      inbox_uri_id,
      key_uri_id,
      public_key_pem
    ) VALUES (account_id, inbox_uri_id, key_uri_id, $6);

    result := (account_id, inbox_uri_id, key_uri_id);
    RETURN result;
  END
$_$;
`, callback);

exports._meta = { version: 1 };
