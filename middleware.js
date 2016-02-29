module.exports = webpackHotMiddleware;

var helpers = require('./helpers');
var pathMatch = helpers.pathMatch;

function webpackHotMiddleware(compiler, opts) {
  opts = opts || {};
  opts.log = opts.log === undefined ? console.log.bind(console) : opts.log;
  opts.path = opts.path || '/__webpack_hmr';
  opts.heartbeat = opts.heartbeat || 10 * 1000;

  var devOpts = opts.devMiddleware ? opts.devMiddleware : false;

  var erroredBundles = {};

  var eventStream = createEventStream(opts.heartbeat);
  compiler.plugin("compile", function() {
    if (opts.log) opts.log("webpack building...");
    eventStream.publish({action: "building"});
  });
  compiler.plugin("done", function(statsResult) {
    statsResult = statsResult.toJson();

    var bundles = extractBundles(statsResult);
    bundles.forEach(function(stats) {
      if (opts.log) {
        opts.log("webpack built " + (stats.name ? stats.name + " " : "") +
          stats.hash + " in " + stats.time + "ms");
      }
      if (stats.errors && stats.errors.length > 0) {
        erroredBundles[stats.hash] = stats.name;
      }
      eventStream.publish({
        name: stats.name,
        action: "built",
        time: stats.time,
        hash: stats.hash,
        warnings: stats.warnings || [],
        errors: stats.errors || [],
        modules: buildModuleMap(stats.modules)
      });
    });
  });
  var middleware = function(req, res, next) {
    if (!pathMatch(req.url, opts.path)) return next();
    eventStream.handler(req, res);
  };
  middleware.publish = eventStream.publish;

  if (!devOpts) return middleware;

  var hotMiddleware = middleware;
  var webpackDevMiddleware = require('webpack-dev-middleware');
  var devMiddleware = webpackDevMiddleware(compiler, devOpts);

  middleware = function(req, res, next) {
    var filename = devMiddleware.getFilenameFromUrl(req.url);
    console.log(erroredBundles, filename);
    return devMiddleware(req, res, function(err) {
      if (err) return next(err);
      return hotMiddleware(req, res, next);
    });
  };
  middleware.publish = eventStream.publish;

  return middleware;
}

function createEventStream(heartbeat) {
  var clientId = 0;
  var clients = {};
  function everyClient(fn) {
    Object.keys(clients).forEach(function(id) {
      fn(clients[id]);
    });
  }
  setInterval(function heartbeatTick() {
    everyClient(function(client) {
      client.write("data: \uD83D\uDC93\n\n");
    });
  }, heartbeat).unref();
  return {
    handler: function(req, res) {
      req.socket.setKeepAlive(true);
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/event-stream;charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      });
      res.write('\n');
      var id = clientId++;
      clients[id] = res;
      req.on("close", function(){
        delete clients[id];
      });
    },
    publish: function(payload) {
      everyClient(function(client) {
          client.write("data: " + JSON.stringify(payload) + "\n\n");
      });
    }
  };
}

function extractBundles(stats) {
  // Stats has modules, single bundle
  if (stats.modules) return [stats];

  // Stats has children, multiple bundles
  if (stats.children && stats.children.length) return stats.children;

  // Not sure, assume single
  return [stats];
}

function buildModuleMap(modules) {
  var map = {};
  modules.forEach(function(module) {
    map[module.id] = module.name;
  });
  return map;
}
