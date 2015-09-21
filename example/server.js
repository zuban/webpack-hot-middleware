var http = require('http');

var express = require('express');

var app = express();

app.use(require('morgan')('short'));

var middleware;

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
  middleware = require("webpack-hot-middleware")(compiler, {
    log: console.log, path: '/__webpack_hmr', heartbeat: 10 * 1000
  });
  app.use(middleware);
})();

// Do anything you like with the rest of your express application.
app.get("/custom", function(req, res) {
  middleware.publish({ object: 123 });
  res.send("Sent custom message to client");
})

app.get("/", function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

if (require.main === module) {
  var server = http.createServer(app);
  server.listen(process.env.PORT || 1616, function() {
    console.log("Listening on %j", server.address());
  });
}
