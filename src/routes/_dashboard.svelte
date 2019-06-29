<!--
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
-->

<h1>{$session.user.preferredUsername}</h1>
<form on:submit='{post}'>
  <textarea name='content'></textarea>
  <input name='document' type='file' />
  <button>Post</button>
</form>
<form on:submit='{announce}'>
  <input name='object' />
  <button>Share</button>
</form>
<form on:submit='{like}'>
  <input name='object' />
  <button>Like</button>
</form>
<ol>
  {#each $inbox as item}
    <li>{JSON.stringify(item)}</li>
  {/each}
</ol>
<script>
  import { get } from 'svelte/store';
  import { stores } from '@sapper/app';
  import { listenEventSource } from 'isomorphism/session/event_source';
  import { create as createNote } from '../lib/session/note';
  import { announce as sessionAnnounce } from '../lib/session/announce';
  import { like as sessionLike } from '../lib/session/like';

  const { session } = stores();
  const inbox = listenEventSource();

  function post(event) {
    event.preventDefault();
    const { content, document } = event.target.elements;
    createNote(get(session), fetch, content.value, document.files[0]);
  }

  function announce(event) {
    event.preventDefault();
    sessionAnnounce(get(session), fetch, event.target.elements.object.value);
  }

  function like(event) {
    event.preventDefault();
    sessionLike(get(session), fetch, event.target.elements.object.value);
  }
</script>
