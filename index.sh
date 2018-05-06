#!/usr/bin/env sh

# Copyright (C) 2018  Miniverse authors
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, version 3 of the License.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

# Node.js on Windows with default configuration does not have dirname and
# readlink command. Use Node.js instead.
cd `node -p 'require("path").dirname(require("fs").realpathSync(process.argv[1]))' "$0"`

# Node.js on Windows with default configuration cannot execute "npm bin" on sh.
# Execute it on Node.js.
PATH="`node -e 'require("child_process").spawn("npm", ["bin"], { shell: true, stdio: "inherit" })'`:$PATH" exec "$@"
