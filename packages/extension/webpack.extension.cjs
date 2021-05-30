// Copyright 2021 @earthwallet/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

const createConfig = require('./webpack.shared.cjs');

module.exports = createConfig(
  {
    extension: './src/extension.ts'
  },
  {
    '@polkadot/wasm-crypto-wasm/data.js': require.resolve('@polkadot/wasm-crypto-wasm/empty')
  }
);
