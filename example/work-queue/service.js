#!/usr/bin/env node

var DNode = require('dnode');
var Hash = require('traverse/hash');

var nodes = {};

function Queues () {
    var waiting = this.waiting = [];
    var pending = this.pending = [];
    var ready = this.ready = [];
    
    this.push = function (node) {
        var role = node.role;
        if (waiting[role] && waiting[role].length) {
            var w = waiting[role].shift();
            w({
                address : node.connection.remoteAddress,
                port : node.connection.remotePort,
            });
        }
        else {
            if (!ready[role]) ready[role] = [];
            ready[role].push(node);
        }
    };
    
    this.pop = function (node) {
        var role = node.role;
        [ waiting, pending, ready ].forEach(function (xs) {
            var i = xs[role].indexOf(node);
            if (i >= 0) xs[role].splice(i, 1);
        });
    };
    
    this.wait = function (role, cb) {
        if (ready[role] && ready[role].length) {
            var r = ready[role].shift();
            cb(r);
        }
        else {
            if (!waiting[role]) waiting[role] = [];
            waiting[role].push(cb);
        }
    };
}

var queues = new Queues;

DNode(function (client, conn) {
    conn.on('ready', function () {
        client.connection = conn;
        queues.push(client);
        
        conn.on('end', function () {
            queues.pop(client);
        });
    });
    
    this.associate = queues.wait.bind(queues);
}).listen(5050);
