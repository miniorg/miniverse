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

<div>
  <form on:submit='{signin}'>
    <input name='username' placeholder='Username' type='text' />
    <input name='password' placeholder='Password' type='password' />
    <button>Sign in</button>
  </form>
  <form on:submit='{signup}'>
    <input name='username' placeholder='Username' type='text' />
    <input name='password' placeholder='Password' type='password' />
    <button>Sign up</button>
  </form>
</div>
<script>
  import { get } from 'svelte/store';
  import { stores } from '@sapper/app';
  import {
    signin as sessionSignin,
    signup as sessionSignup
  } from '../lib/session/identity';

  const { session } = stores();

  function signin(event) {
    const username = event.target.elements.username.value;
    const password = event.target.elements.password.value;

    event.preventDefault();

    sessionSignin(get(session), fetch, username, password).then(
      user => session.update(
        sessionValue => Object.assign({ user }, sessionValue)));
  }

  function signup(event) {
    const username = event.target.elements.username.value;
    const password = event.target.elements.password.value;

    event.preventDefault();
    sessionSignup(get(session), fetch, username, password).then(
      user => session.update(
        sessionValue => Object.assign({ user }, sessionValue)));
  }
</script>
