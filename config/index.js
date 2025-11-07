// const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

module.exports = function (merge, { command, mode }) {
  const baseConfig = {
    projectName: 'law-app',
    date: '2025-7-2',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [
      // "@tarojs/plugin-generator"
    ],
    defineConstants: {},
    copy: {
      patterns: [
        { from: 'src/assets/images/favicon.ico', to: 'dist/favicon.ico' },
        { from: 'src/assets/images/index.png', to: 'dist/index.png' }
      ],
      options: {}
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      // webpackChain(chain) {
      //   chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
      // }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      router: {
        mode: 'hash'
      },
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      // webpackChain(chain) {
      //   chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
      // }
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false
        }
      }
    }
  }

  const devConfig = {
    logger: {
      quiet: false,
      stats: true
    },
    mini: {},
    h5: {
      devServer: {
        port: 10086,
        proxy: {
          '/api': {
            target: 'https://www.fudulegal.com',
            changeOrigin: true,
            secure: true,
            pathRewrite: {
              '^/api': '/api'
            }
          }
        }
      }
    }
  }

  const prodConfig = {
    mini: {},
    h5: {}
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
}
