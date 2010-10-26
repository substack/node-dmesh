var DNode = require('dnode');
var Hash = require('traverse/hash');

function Queues () {
    var waiting = this.waiting = [];
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
        [ waiting, ready ].forEach(function (xs) {
            var i = xs[role].indexOf(node);
            if (i >= 0) xs[role].splice(i, 1);
        });
    };
    
    this.acquire = function (role, cb) {
        if (ready[role] && ready[role].length) {
            var res = ready[role].shift();
            cb(res);
        }
        else {
            if (!waiting[role]) waiting[role] = [];
            waiting[role].push(cb);
        }
    };
}

var queues = new Queues;

module.exports = DNode(function (client, conn) {
    conn.on('ready', function () {
        client.connection = conn;
        queues.push(client);
        
        conn.on('end', function () {
            queues.pop(client);
        });
    });
    
    this.acquire = queues.acquire.bind(queues);
});
