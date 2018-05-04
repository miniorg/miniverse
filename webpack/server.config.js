/*
  Copyright (C) 2018  Akihiko Odaki <nekomanma@pixiv.co.jp>

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

const { join } = require('path');
const { server } = require('sapper/webpack/config');
const { dependencies } = require('../package');

module.exports = {
  entry: Object.assign({
    processor: join(__dirname, '../app/processor')
  }, server.entry()),
  output: server.output(),
  mode: process.env.NODE_ENV,
  devtool: 'source-map',
  externals: Object.keys(dependencies),
  resolve: { extensions: ['.html', '.js'] },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.html$/,
        exclude: /node_modules/,
        use: {
          loader: 'svelte-loader',
          options: {
            css: false,
            cascade: false,
            store: true,
            generate: 'ssr'
          }
        }
      }
    ]
  }
};
