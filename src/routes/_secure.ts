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

import { Response, NextFunction } from 'express';
import { Custom as CustomError } from '../lib/errors';
import { Request } from '../subsystems/server';

interface Handler {
  (request: Request, response: Response, next: NextFunction): unknown;
}

export default (handle: Handler) => async (request: Request, response: Response, next: NextFunction) => {
  try {
    await handle(request, response, next);
  } catch (error) {
    if (error instanceof CustomError) {
      error.log(request.repository);
    } else {
      request.repository.console.error(error);
    }

    response.sendStatus(500);
  }
};
