module.exports = {
  lintOnSave: false,
  runtimeCompiler: true,
  publicPath: '/loginacudientes/',
  outputDir: 'loginacudientes',
  devServer: {
    port: 8084
  },
  configureWebpack: {
    resolve: {
       symlinks: false
    }
  },
  transpileDependencies: [
    '@coreui/utils',
    '@coreui/vue'
  ]
}
