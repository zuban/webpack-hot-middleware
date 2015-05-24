var http = require('http');

var express = require('express');

var app = express();

app.use(require('morgan')('short'));

// ************************************
// This is the real meat of the example
// ************************************
(function() {

  // Step 1: Create & configure a webpack compiler
  var webpack = require('webpack');
  var webpackConfig = require('./webpack.config');
  var compiler = webpack(webpackConfig);

  // Step 2: Attach the dev middleware to the compiler & the server
  app.use(require("webpack-dev-middleware")(compiler, {
    noInfo: true, publicPath: webpackConfig.output.publicPath
  }));

  // Step 3: Attach the hot middleware to the compiler & the server
  app.use(require("webpack-hot-middleware")(compiler, {
    log: console.log, path: '/__webpack_hmr', heartbeat: 10 * 1000
  }));

  // Step 4: For bonus points, setup server side hot reloading
  var serverConfig = require('./webpack.server.config');
  var serverCompiler = webpack(serverConfig);
  var serverModule;
  serverCompiler.plugin("compile", function() {
    serverModule = usefulPromise();
  });
  serverCompiler.watch(200, function(err, stats) {
    if (err) return console.warn(err);
    process.emit('hot-reload');
    console.log("Server bundle rebuilt.", stats.toJson());
    serverModule.resolve(require('./build/server-bundle'));
  });

  app.get("/", function(req, res) {
    serverModule.then(function(m) {
      m.api.render();
      res.sendFile(__dirname + '/index.html');
    });
  });
})();

function usefulPromise() {
  var p = new Promise(function(resolve, reject) {
    p.resolve = resolve;
    p.reject = reject;
  });
  return p;
}

if (require.main === module) {
  var server = http.createServer(app);
  server.listen(process.env.PORT || 1616, function() {
    console.log("Listening on %j", server.address());
  });
}
