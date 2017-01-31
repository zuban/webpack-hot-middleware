"use strict";
var helpers = require('./helpers');
var pathMatch = helpers.pathMatch;
var Shared = require("./Shared");

class HotReplacement {
    constructor(opts, compiler) {
        opts = opts || {};
        opts.log = typeof opts.log == 'undefined' ? console.log.bind(console) : opts.log;
        opts.path = opts.path || '/__webpack_hmr';
        opts.heartbeat = opts.heartbeat || 10 * 1000;

        this.eventStream = this.createEventStream(opts.heartbeat);
        this.latestStats = null;


        this.context = {
            state: false,
            webpackStats: undefined,
            callbacks: [],
            options: {},
            compiler: compiler,
            watching: undefined,
            forceRebuild: false
        };
        this.shared = Shared(this.context);
    }

    onCheck(req, res) {
        this.eventStream.handler(req, res);
        if (this.latestStats)
            this.publishStats("sync", this.latestStats);
    }

    onCompile() {
        // this.shared.rebuild();
        this.latestStats = null;
        console.log("webpack building...");
        this.eventStream.publish({action: "building"});
    }

    onDone(statsResult) {
        this.latestStats = statsResult;
        this.publishStats("built", this.latestStats);
    }

    createEventStream(heartbeat) {
        var clientId = 0;
        var clients = {};

        function everyClient(fn) {
            Object.keys(clients).forEach(function (id) {
                fn(clients[id]);
            });
        }

        setInterval(function heartbeatTick() {
            everyClient(function (client) {
                client.write("data: \uD83D\uDC93\n\n");
            });
        }, heartbeat).unref();
        return {
            handler: function (req, res) {
                req.socket.setKeepAlive(true);
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'text/event-stream;charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive'
                });
                res.write('\n');
                var id = clientId++;
                clients[id] = res;
                req.on("close", function () {
                    delete clients[id];
                });
            },
            publish: function (payload) {
                everyClient(function (client) {
                    client.write("data: " + JSON.stringify(payload) + "\n\n");
                });
            }
        };
    }

    publishStats(action, statsResult) {
        // For multi-compiler, stats will be an object with a 'children' array of stats
        var bundles = this.extractBundles(statsResult.toJson({errorDetails: false}));
        var _this = this;
        bundles.forEach(function (stats) {

            console.log("webpack built " + (stats.name ? stats.name + " " : "") +
                stats.hash + " in " + stats.time + "ms");
            _this.eventStream.publish({
                name: stats.name,
                action: action,
                time: stats.time,
                hash: stats.hash,
                warnings: stats.warnings || [],
                errors: stats.errors || [],
                modules: _this.buildModuleMap(stats.modules)
            });
        });
    }

    extractBundles(stats) {
        // Stats has modules, single bundle
        if (stats.modules) return [stats];

        // Stats has children, multiple bundles
        if (stats.children && stats.children.length) return stats.children;

        // Not sure, assume single
        return [stats];
    }

    buildModuleMap(modules) {
        var map = {};
        modules.forEach(function (module) {
            map[module.id] = module.name;
        });
        return map;
    }
}


module.exports = HotReplacement;