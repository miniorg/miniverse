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

const LicenseInfoWebpackPlugin = require('license-info-webpack-plugin').default;
const { join } = require('path');
const {
  BannerPlugin,
  DefinePlugin,
  HotModuleReplacementPlugin
} = require('webpack');
const { client, server, serviceworker } = require('sapper/config/webpack');
const { dependencies } = require('./package');

module.exports = {
  client: {
    entry: client.entry(),
    output: client.output(),
    mode: process.env.NODE_ENV,
    devtool: 'source-map',
    resolve: {
      alias: { url: join(__dirname, 'src/lib/isomorphism/browser/url') },
      extensions: ['.js', '.html']
    },
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
        outputPath: 'static'
      })
    ]
  },
  server: {
    entry: Object.assign({
      processor: join(__dirname, './src/processor')
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
    },
    plugins: [
      new BannerPlugin({
        banner: '#!/usr/bin/env node',
        raw: true,
        test: /^processor\.js$/
      })
    ]
  },
  serviceworker: {
    entry: serviceworker.entry(),
    output: serviceworker.output(),
    mode: process.env.NODE_ENV,
    devtool: 'source-map'
  }
};

if (process.env.NODE_ENV == 'development') {
  module.exports.client.plugins.push(new HotModuleReplacementPlugin);
}
