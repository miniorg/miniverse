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

exports.up = (db, callback) => db.runSql(`ALTER TABLE statuses ADD published TIMESTAMP;

DROP FUNCTION insert_announce(varchar, bigint, bigint);

CREATE FUNCTION insert_announce(
  published timestamp,
  uri varchar,
  actor_id bigint,
  object_id bigint) RETURNS bigint
    LANGUAGE plpgsql AS $_$
  #variable_conflict use_column
  DECLARE announce_id bigint;
  BEGIN
    INSERT INTO statuses (published, person_id) VALUES ($1, $3)
      RETURNING statuses.id INTO announce_id;

    INSERT INTO announces (id, object_id) VALUES (announce_id, $4);

    IF $2 IS NOT NULL THEN
      INSERT INTO uris (id, uri) VALUES (announce_id, $2)
        ON CONFLICT (uri) DO UPDATE SET id = announce_id;
    END IF;

    RETURN announce_id;
  END
$_$;

DROP FUNCTION insert_note(varchar, bigint, bigint, text, text, text, bigint[]);

CREATE FUNCTION insert_note(
  published timestamp,
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
    IF $2 IS NULL THEN
      INSERT INTO statuses (published, person_id) VALUES ($1, $3)
        RETURNING statuses.id INTO id;
    ELSE
      rescued := FALSE;

      BEGIN
        INSERT INTO uris (uri) VALUES ($2) RETURNING uris.id INTO id;
      EXCEPTION WHEN unique_violation THEN
        UPDATE statuses SET published = $1, person_id = $3 FROM uris
          WHERE
            statuses.id = uris.id AND statuses.person_id IS NULL AND
              uris.uri = $2
          RETURNING uris.id INTO id;

        IF id IS NULL THEN
          RAISE;
        END IF;

        rescued := TRUE;
      END;

      IF NOT rescued THEN
        INSERT INTO statuses (id, published, person_id) VALUES (id, $1, $3);
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
        INSERT INTO statuses (id, person_id) VALUES (in_reply_to_id, NULL);
      END IF;
    END IF;

    INSERT INTO notes (id, in_reply_to_id, summary, content)
      VALUES (id, in_reply_to_id, $6, $7);

    INSERT INTO mentions (note_id, href_id) SELECT id, unnest FROM unnest($8);

    result := (id, in_reply_to_id);
    RETURN result;
  END
$_$;
`, callback);
