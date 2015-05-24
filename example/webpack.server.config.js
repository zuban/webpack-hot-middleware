var clientConfig = require('./webpack.config');

module.exports = {
  context: clientConfig.context,
  entry: [
    // Webpack comes with code to check & reload modules
    // by listening for an event on the process object
    'webpack/hot/signal?hot-reload',
    // Include same application as the client side
    // but via a different entry point
    './client-for-server.js'
  ],
  target: 'node',
  output: {
    path: __dirname + '/build',
    publicPath: '/',
    filename: 'server-bundle.js',
  },
  devtool: clientConfig.devtool,
  plugins: clientConfig.plugins
};
