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

import { Request, Response } from 'express';
import { raw } from 'body-parser';
import { promisify } from 'util';
import LocalAccount from '../../lib/tuples/local_account';
import secure from '../_secure';
import cookie from './_cookie';

const recovery = {};
const setBody = promisify(raw()) as
  unknown as
  (request: Request, response: Response) => Promise<unknown>;

export const post = secure(async (request, response) => {
  await setBody(request, response);

  const { body } = request;
  const { repository } = response.app.locals;
  const salt = body.slice(0, 64);
  const serverKey = body.slice(64, 96);
  const storedKey = body.slice(96, 128);
  const username = body.slice(128).toString();
  let account;

  try {
    account = await LocalAccount.create(repository, {
      actor: {
        username,
        name: '',
        summary: ''
      },
      admin: false,
      salt,
      serverKey,
      storedKey
    }, () => recovery);
  } catch (error) {
    if (error == recovery) {
      response.sendStatus(422);
      return;
    }

    throw error;
  }

  await cookie(repository, account, response);
  response.sendStatus(204);
});
