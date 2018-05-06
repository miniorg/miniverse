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

const ExtractTextPlugin = require('extract-text-webpack-plugin');
const LicenseInfoWebpackPlugin = require('license-info-webpack-plugin').default;
const { DefinePlugin, HotModuleReplacementPlugin } = require('webpack');
const { client } = require('sapper/webpack/config');

module.exports = {
  entry: client.entry(),
  output: client.output(),
  mode: process.env.NODE_ENV,
  devtool: 'source-map',
  resolve: { extensions: ['.js', '.html'] },
  module: {
    rules: [
      {
        test: /\.html$/,
        exclude: /node_modules/,
        use: {
          loader: 'svelte-loader',
          options: {
            cascade: false,
            hotReload: true,
            hydratable: true,
            shared: true,
            store: true
          }
        }
      }
    ],
  },
  plugins: [
    new DefinePlugin({
      'process.browser': true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    new LicenseInfoWebpackPlugin({
      output: 'html',
      outputPath: 'assets'
    })
  ]
};

if (process.env.NODE_ENV == 'development') {
  module.exports.module.rules[0].use.options.emitCss = true;
  module.exports.module.rules.push({
    test: /\.css$/,
    use: ExtractTextPlugin.extract({
      fallback: 'style-loader',
      use: 'css-loader',
    }),
  });

  module.exports.plugins.push(new HotModuleReplacementPlugin);
}
