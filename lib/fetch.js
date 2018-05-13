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

import fetch, { FetchError } from 'node-fetch';
import { domainToASCII } from 'url';
import TemporaryError from './temporary_error';

export default ({ host }, url, options) => {
  const headers = { 'User-Agent': `Miniverse (${domainToASCII(host)})` };

  return fetch(url, Object.assign({ size: 1048576, timeout: 16384 }, options, {
    headers: options ? Object.assign(headers, options.headers) : headers
  })).then(response => {
    if (!response.ok) {
      return response.buffer().then(() => {
        if ([429, 500, 502, 503, 504].includes(response.status)) {
          throw new TemporaryError;
        }

        throw new Error;
      });
    }

    return response;
  }, error => {
    if (error instanceof FetchError) {
      const wrapper = new TemporaryError;
      wrapper.original = error;
      throw wrapper;
    }

    throw error;
  });
};
