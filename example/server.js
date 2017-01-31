var http = require('http');
var express = require('express');
var webpack = require('webpack');
var HotReplacement = require('../HotReplacement');
var MemoryFS = require('memory-fs')
var app = express();


var hmr = null;
var compiler = null;

app.get("/template1", function (req, res) {

});
app.get("/", function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.get("/bundle", function (req, res) {

    var webpackConfig = {
        context: __dirname,
        entry: [
            // Add the client which connects to our middleware
            // You can use full urls like 'webpack-hot-middleware/client?path=http://localhost:3000/__webpack_hmr'
            // useful if you run your app from another point like django
            'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000',
            // And then the actual application
            './client.js'
        ],
        output: {
            path: __dirname,
            publicPath: '/',
            filename: 'bundle.js'
        },
        devtool: '#source-map',
        plugins: [
            // new webpack.optimize.OccurenceOrderPlugin(),
            new webpack.HotModuleReplacementPlugin(),
            new webpack.NoErrorsPlugin()
        ],
    };

    compiler = webpack(webpackConfig);

    hmr = new HotReplacement({
        log: console.log,
        path: '/__webpack_hmr',
        heartbeat: 10 * 1000
    }, compiler);
    hmr.onCompile();

    compiler.run(function (err, stats) {
        hmr.onDone(stats);
        res.send(stats.compilation.assets['bundle.js'].source());
    });
});
app.get("/__webpack_hmr", function (req, res) {
    if (hmr) {
        hmr.onCheck(req, res);
    }
    else {
        req.socket.setKeepAlive(true);
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/event-stream;charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive'
        });
        res.write('\n');
    }
});

app.get("/rebuild", function (req, res) {


    compiler.run(function (err, stats) {
        hmr.onDone(stats);
        res.sendStatus(200);
    });
});

var server = http.createServer(app);
server.listen(process.env.PORT || 1616, function () {
    console.log("Listening on %j", server.address());
});
