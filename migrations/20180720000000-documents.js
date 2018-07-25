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

exports.up = (db, callback) => db.runSql(`CREATE TABLE documents (
  id bigint PRIMARY KEY DEFAULT nextval('id_seq'),
  uuid uuid NOT NULL,
  format varchar NOT NULL);

CREATE TABLE unlinked_documents (
  id serial PRIMARY KEY,
  uuid uuid NOT NULL,
  format varchar NOT NULL
);

CREATE TABLE attachments (
  note_id bigint REFERENCES notes (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  document_id bigint NOT NULL REFERENCES documents (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  UNIQUE (note_id, document_id));

CREATE OR REPLACE FUNCTION delete_status(id bigint, attributed_to_id bigint)
    RETURNS void LANGUAGE plpgsql AS $_$
  DECLARE attached_documents bigint[];
  DECLARE current_id bigint;
  DECLARE deleted_uuid uuid;
  DECLARE deleted_format varchar;
  BEGIN
    IF EXISTS (SELECT TRUE FROM statuses WHERE statuses.id = $1 AND statuses.actor_id = $2) THEN
      INSERT INTO tombstones (id) VALUES ($1);

      FOR current_id IN SELECT announces.id FROM announces WHERE object_id = $1 LOOP
        BEGIN
          INSERT INTO tombstones (id) VALUES (current_id);
        EXCEPTION WHEN foreign_key_violation THEN
          -- No uri to track with tombstone
        END;

        DELETE FROM statuses WHERE statuses.id = current_id;
      END LOOP;

      attached_documents :=
        ARRAY(SELECT document_id FROM attachments WHERE note_id = $1);

      DELETE FROM statuses WHERE statuses.id = $1;

      FOR current_id IN SELECT unnest FROM unnest(attached_documents) LOOP
        deleted_uuid := NULL;

        BEGIN
          DELETE FROM documents WHERE documents.id = current_id
            RETURNING uuid, format INTO deleted_uuid, deleted_format;
        EXCEPTION WHEN foreign_key_violation THEN
          -- The document is still referred by something else, so do not unlink.
        END;

        IF deleted_uuid IS NOT NULL THEN
          DELETE FROM uris WHERE uris.id = current_id;
          INSERT INTO unlinked_documents (uuid, format)
            VALUES (deleted_uuid, deleted_format);
        END IF;
      END LOOP;
    END IF;
  END
$_$;

CREATE FUNCTION insert_document_with_url(uuid uuid, format varchar, url varchar)
    RETURNS bigint LANGUAGE plpgsql AS $_$
  DECLARE id bigint;
  BEGIN
    INSERT INTO uris (uri, allocated) VALUES ($3, TRUE)
      ON CONFLICT (uri) DO UPDATE SET allocated = TRUE WHERE NOT uris.allocated
      RETURNING uris.id INTO id;

    INSERT INTO documents (id, uuid, format) VALUES (id, $1, $2);

    RETURN id;
  END
$_$;

DROP FUNCTION insert_note(
  timestamp, varchar, bigint, bigint,
  text, text, text, varchar[],
  bigint[]);

CREATE FUNCTION insert_note(
  published timestamp,
  uri varchar,
  attributed_to_id bigint,
  in_reply_to_id bigint,
  in_reply_to text,
  summary text,
  content text,
  attachments bigint[],
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

    INSERT INTO attachments (note_id, document_id)
      SELECT note_id, unnest FROM unnest($8);

    FOR hashtag_name IN SELECT unnest FROM unnest($9) LOOP
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
      SELECT note_id, unnest FROM unnest($10);

    result := (note_id, in_reply_to_id);
    RETURN result;
  END
$_$;
`, callback);

exports._meta = { version: 1 };
