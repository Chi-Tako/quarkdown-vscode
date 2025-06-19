//@ts-check
'use strict';

const path = require('path');

/** @type {import('webpack').Configuration} */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'out' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // these dependencies are bundled with the extension
    // but we can exclude them to reduce bundle size
    puppeteer: 'commonjs puppeteer' // Optional dependency for PDF export
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
    alias: {
      // Add aliases for easier imports
      '@': path.resolve(__dirname, 'src'),
      '@compiler': path.resolve(__dirname, 'src/compiler'),
      '@stdlib': path.resolve(__dirname, 'src/stdlib'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@themes': path.resolve(__dirname, 'src/themes')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                module: 'es6' // override `tsconfig.json` so that TypeScript emits native JavaScript modules.
              }
            }
          }
        ]
      },
      {
        test: /\.json$/,
        type: 'json'
      },
      {
        test: /\.css$/,
        use: ['raw-loader'] // Bundle CSS as strings
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
  optimization: {
    minimize: false, // Don't minimize in development
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        stdlib: {
          test: /[\\/]src[\\/]stdlib[\\/]/,
          name: 'stdlib',
          chunks: 'all',
        }
      }
    }
  },
  plugins: [
    // Add any webpack plugins here
  ]
};

/** @type {import('webpack').Configuration} */
const webExtensionConfig = {
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
  target: 'webworker', // extensions run in a webworker context for VS Code web 📖 -> https://webpack.js.org/configuration/target/#target

  entry: './src/extension.ts',
  output: {
    filename: 'extension-web.js',
    path: path.resolve(__dirname, 'out'),
    libraryTarget: 'commonjs',
    devtoolModuleFilenameTemplate: '../../[resource-path]'
  },
  resolve: {
    mainFields: ['browser', 'module', 'main'], // look for `browser` entry point in imported node modules
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@compiler': path.resolve(__dirname, 'src/compiler'),
      '@stdlib': path.resolve(__dirname, 'src/stdlib'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@themes': path.resolve(__dirname, 'src/themes')
    },
    fallback: {
      // Webpack 5 no longer polyfills Node.js core modules automatically.
      // see https://webpack.js.org/configuration/resolve/#resolvefallback
      path: require.resolve('path-browserify'),
      fs: false, // File system not available in browser
      os: require.resolve('os-browserify/browser'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util'),
      buffer: require.resolve('buffer'),
      process: require.resolve('process/browser')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                module: 'es6',
                lib: ['es6', 'dom'] // Add DOM lib for web extension
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['raw-loader']
      }
    ]
  },
  externals: {
    vscode: 'commonjs vscode',
    // Exclude Node.js specific modules for web extension
    fs: 'commonjs fs',
    path: 'commonjs path',
    os: 'commonjs os',
    puppeteer: 'commonjs puppeteer' // Not available in web
  },
  performance: {
    hints: false
  },
  devtool: 'nosources-source-map'
};

module.exports = [extensionConfig, webExtensionConfig];