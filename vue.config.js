module.exports = {
  lintOnSave: false,
  runtimeCompiler: true,
  publicPath: '/login_Acudientes/',
  outputDir: 'login_Acudientes',
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
