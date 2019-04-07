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

import { Request, RequestInit, Response } from 'node-fetch';
import { Any } from './generated_activitystreams';
import Repository from './repository';
import LocalAccount from './tuples/local_account';
import Status from './tuples/status';
import URI from './tuples/uri';

export function fetch(
  this: void,
  repository: Repository,
  url: string | Request,
  init?: RequestInit): Promise<Response>;

export function postStatus(this: void, repository: Repository, status: Status):
  Promise<void>;

export function postToInbox(
  this: void,
  repository: Repository,
  sender: LocalAccount,
  inboxURI: URI,
  object: { toActivityStreams(): Promise<Any> }): Promise<void>;
