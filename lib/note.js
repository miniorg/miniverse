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

export default class {
  constructor(properties) {
    Object.assign(this, properties);
  }

  toActivityStreams() {
    return { type: 'Note', content: this.content };
  }

  static async create(repository, uri, attributedTo, content) {
    const note = new this({ attributedTo, content });
    const [attributedToAccount, recipients] = await Promise.all([
      repository.selectLocalAccountByPerson(attributedTo),
      repository.selectLocalAccountsByFollowee(attributedTo),
      repository.insertNote(note, uri)
    ]);

    if (attributedToAccount) {
      recipients.push(attributedToAccount);
    }

    await repository.insertIntoInboxes(recipients, note);
    return note;
  }

  static async fromParsedActivityStreams(repository, attributedTo, object) {
    const [uri, content] = await Promise.all([
      object.getId(),
      object.getContent()
    ]);

    return this.create(repository, uri, attributedTo, content);
  }
}
