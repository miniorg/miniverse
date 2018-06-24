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

exports.up = (db, callback) => db.runSql(`CREATE TABLE hashtags (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE);

CREATE TABLE hashtags_notes (
  hashtag_id BIGINT REFERENCES hashtags (id)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  note_id BIGINT REFERENCES notes (id)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  UNIQUE (note_id, hashtag_id));


DROP FUNCTION insert_note(
  timestamp, varchar, bigint, bigint,
  text, text, text, bigint[]);

CREATE FUNCTION insert_note(
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
  DECLARE rescued BOOL;
  BEGIN
    IF $2 IS NULL THEN
      INSERT INTO statuses (published, person_id) VALUES ($1, $3)
        RETURNING statuses.id INTO note_id;
    ELSE
      rescued := FALSE;

      BEGIN
        INSERT INTO uris (uri) VALUES ($2) RETURNING uris.id INTO note_id;
      EXCEPTION WHEN unique_violation THEN
        UPDATE statuses SET published = $1, person_id = $3 FROM uris
          WHERE
            statuses.id = uris.id AND statuses.person_id IS NULL AND
              uris.uri = $2
          RETURNING uris.id INTO note_id;

        IF note_id IS NULL THEN
          RAISE;
        END IF;

        rescued := TRUE;
      END;

      IF NOT rescued THEN
        INSERT INTO statuses (id, published, person_id)
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
        INSERT INTO statuses (id, person_id) VALUES (in_reply_to_id, NULL);
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
`, callback);
