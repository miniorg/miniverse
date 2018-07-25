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

import Actors from './actors';
import Announces from './announces';
import Base from './base';
import Challenges from './challenges';
import Cookies from './cookies';
import Documents from './documents';
import Follows from './follows';
import Hashtags from './hashtags';
import Likes from './likes';
import LocalAccounts from './local_accounts';
import Mentions from './mentions';
import RemoteAccounts from './remote_accounts';
import Notes from './notes';
import Statuses from './statuses';
import Subscribers from './subscribers';
import UnlinkedDocuments from './unlinked_documents';
import URIs from './uris';

export default Base;

for (const Constructor of [
  Actors, Announces, Challenges, Cookies,
  Documents, Follows, Hashtags, Likes,
  LocalAccounts, Mentions, RemoteAccounts, Notes,
  Statuses, Subscribers, UnlinkedDocuments, URIs
]) {
  for (const key of Object.getOwnPropertyNames(Constructor.prototype)) {
    Base.prototype[key] = Constructor.prototype[key];
  }
}
