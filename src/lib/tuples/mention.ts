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

import { Mention as ActivityStreams } from '../generated_activitystreams';
import Actor from './actor';
import Relation, { Reference } from './relation';

type Properties = { hrefId: string } | { hrefId?: string; href: Actor };

interface References {
  href: Actor | null;
}

export default class Mention extends Relation<Properties, References> {
  readonly href?: Reference<Actor | null>;
  readonly hrefId!: string;

  async toActivityStreams(recover: (error: Error) => unknown): Promise<ActivityStreams> {
    const actor = await this.select('href');
    if (!actor) {
      throw recover(new Error('href not found.'));
    }

    const href = await actor.getUri(recover);
    if (!href) {
      throw recover(new Error('href\'s uri not found.'));
    }

    return { type: 'Mention', href };
  }
}

Mention.references = {
  href: { query: Mention.withRepository('selectActorById'), id: 'hrefId' }
};
