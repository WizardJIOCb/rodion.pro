import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';

export const mainConfig: Configuration = {
  entry: './src/main/index.ts',
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.json'],
  },
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
    'koffi': 'commonjs koffi',
    'uiohook-napi': 'commonjs uiohook-napi',
  },
};
