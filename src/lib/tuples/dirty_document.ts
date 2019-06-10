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

import Repository from '../repository';

interface Properties {
  readonly repository: Repository;
  readonly id: number;
  readonly uuid: string;
  readonly format: string;
}

export default class DirtyDocument {
  readonly repository: Repository;
  readonly id: number;
  readonly uuid: string;
  readonly format: string;

  constructor({ repository, id, uuid, format }: Properties) {
    this.repository = repository;
    this.id = id;
    this.uuid = uuid;
    this.format = format;
  }
}
