/*
  Copyright (C) 2019  Miniverse authors

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

exports.up = (db, callback) => db.runSql(`
CREATE TABLE dirty_documents (
  id serial PRIMARY KEY,
  uuid uuid NOT NULL,
  format varchar NOT NULL);

DROP FUNCTION insert_document_with_url;

CREATE FUNCTION insert_document_with_url(dirty_id integer, url varchar)
    RETURNS bigint LANGUAGE plpgsql AS $_$
  DECLARE uri_id bigint;
  BEGIN
    INSERT INTO uris (uri, allocated) VALUES ($2, TRUE)
      ON CONFLICT (uri) DO UPDATE SET allocated = TRUE WHERE NOT uris.allocated
      RETURNING uris.id INTO uri_id;

    INSERT INTO documents (id, uuid, format) SELECT uri_id, uuid, format
      FROM dirty_documents WHERE dirty_documents.id = $1;

    DELETE FROM dirty_documents WHERE id = $1;

    RETURN uri_id;
  END
$_$;`, callback);

exports._meta = { version: 1 };
