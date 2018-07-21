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

import { domainToASCII, domainToUnicode } from 'url';
import ParsedActivityStreams, { NoHost, TypeNotAllowed } from '../parsed_activitystreams';
import postStatus from '../transfer/post_status';
import Actor from './actor';
import Hashtag from './hashtag';
import Mention from './mention';
import Relation, { withRepository } from './relation';
import Status from './status';
import URI, { encodeSegment } from './uri';

async function resolveNoteByURIIfLocal(repository, uri) {
  const localPrefix = `https://${domainToASCII(repository.host)}/@`;

  if (uri.startsWith(localPrefix)) {
    const [username, id] = uri.slice(localPrefix.length).split('/', 2);
    const note = await repository.selectNoteById(id);
    const status = await note.select('status');
    const actor = await status.select('actor');

    if (username != actor.username) {
      throw new Error;
    }

    return note;
  }

  return null;
}

export default class Note extends Relation {
  async toActivityStreams() {
    const [
      [published, [attributedToActor, attributedTo]],
      hashtags,
      mentions,
      inReplyTo
    ] = await Promise.all([
      this.select('status').then(status => Promise.all([
        status.published,
        status.select('actor')
              .then(actor => Promise.all([actor, actor.getUri()]))
      ])),
      this.select('hashtags').then(array =>
        Promise.all(array.map(element => element.toActivityStreams()))),
      this.select('mentions').then(array =>
        Promise.all(array.map(element => element.toActivityStreams()))),
      this.repository.selectStatusById(this.inReplyToId).then(async status => {
        if (status) {
          return status.getUri();
        }

        const uri = await this.repository.selectURIById(this.inReplyToId);
        return uri && uri.uri;
      }),
    ]);

    const repositoryHost = domainToASCII(this.repository.host);
    const acct = encodeSegment(attributedToActor.host ?
      `${attributedToActor.username}@${domainToUnicode(attributedToActor.host)}` :
      attributedToActor.username);

    return {
      type: 'Note',
      id: `https://${repositoryHost}/@${acct}/${this.id}`,
      published,
      attributedTo,
      inReplyTo,
      to: 'https://www.w3.org/ns/activitystreams#Public',
      summary: this.summary,
      content: this.content,
      tag: hashtags.concat(mentions)
    };
  }

  validate() {
    if (this.summary == '') {
      throw new Error;
    }
  }

  static async create(repository, published, actor, content, { uri = null, inReplyToId = null, inReplyToUri = null, summary = null, hashtags = [], mentions = [] } = {}) {
    const note = new this({
      repository,
      status: new Status({
        repository,
        published,
        actor,
        uri: uri && new URI({ repository, uri, allocated: true })
      }),
      inReplyToId,
      summary,
      content,
      hashtags: hashtags.map(name => new Hashtag({ repository, name })),
      mentions: mentions.map(href => new Mention({ repository, href }))
    });

    note.validate();
    await repository.insertNote(note, inReplyToUri);
    await postStatus(repository, note.status);

    return note;
  }

  static async createFromParsedActivityStreams(repository, object, givenAttributedTo) {
    const type = await object.getType();
    if (!type.has('Note')) {
      throw new TypeNotAllowed;
    }

    const [
      uri, published, attributedTo, to,
      [inReplyToId, inReplyToUri], summary, content, [hashtags, mentions]
    ] = await Promise.all([
      object.getId(),
      object.getPublished(),
      givenAttributedTo || object.getAttributedTo().then(
        Actor.fromParsedActivityStreams.bind(Actor, repository)),
      object.getTo().then(elements =>
        Promise.all(elements.map(element => element.getId()))),
      object.getInReplyTo().then(async parsed => {
        if (parsed) {
          const uri = await parsed.getId();
          const note = await resolveNoteByURIIfLocal(repository, uri);

          return [note ? note.id : null, uri];
        }

        return [null, null];
      }),
      object.getSummary(),
      object.getContent(),
      object.getTag().then(async tag => {
        const asyncTypes = tag.map(element => element.getType());

        return Promise.all([
          Promise.all(asyncTypes).then(types => Promise.all(
            types.map((type, index) => [type, index])
                 .filter(([type]) => type.has('Hashtag'))
                 .map(([, index]) => tag[index].getName()))),
          Promise.all(tag.map(async (element, index) => {
            const type = await asyncTypes[index];

            if (type.has('Mention')) {
              const href = await element.getHref();
              const parsed =
                new ParsedActivityStreams(repository, href, NoHost);

              return Actor.fromParsedActivityStreams(repository, parsed);
            }

            return null;
          })).then(nullables => nullables.filter(Boolean))
        ]);
      }),
    ]);

    if (!to.includes('https://www.w3.org/ns/activitystreams#Public')) {
      return null;
    }

    return this.create(
      repository,
      published,
      attributedTo,
      content,
      { uri, inReplyToId, inReplyToUri, summary, hashtags, mentions });
  }

  static async fromParsedActivityStreams(repository, object, givenAttributedTo) {
    const uri = await object.getId();
    if (uri) {
      const localNote = await resolveNoteByURIIfLocal(repository, uri);
      if (localNote) {
        return localNote;
      }

      const uriEntity = await repository.selectAllocatedURI(uri);
      if (uriEntity) {
        const remoteNote = await repository.selectNoteById(uriEntity.id);
        if (remoteNote) {
          return remoteNote;
        }

        throw new TypeNotAllowed;
      }
    }

    return this.createFromParsedActivityStreams(
      repository, object, givenAttributedTo);
  }
}

Note.references = {
  status: {
    query: withRepository('selectStatusById'),
    id: 'id',
    inverseOf: 'extension'
  },
  hashtags: {
    query: withRepository('selectHashtagsByNoteId'),
    id: 'id'
  },
  mentions: {
    query: withRepository('selectMentionsIncludingActorsByNoteId'),
    id: 'id'
  }
};
