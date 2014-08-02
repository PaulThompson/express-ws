var ServerResponse = require('http').ServerResponse;
var WebSocketServer = require('ws').Server;

/**
 * @param {express.Application} app
 * @param {http.Server} [server]
 */
module.exports = function (app, server) {
  if(!server) {
    var app_listen = app.listen

    app.listen = function()
    {
      server = app_listen.apply(app, arguments)

      return server
    }
  }

  function addSocketRoute(route, middleware, callback) {
    var args = [].splice.call(arguments, 0);

    if (args.length < 2)
      throw new SyntaxError('Invalid number of arguments');

    if (args.length === 2) {
      middleware = [middleware];
    } else if (typeof middleware === 'object') {
      middleware.push(callback);
    } else {
      middleware = args.slice(1);
    }

    var wss = new WebSocketServer({
      server: server,
      path: route
    });
    wss.on('connection', function(ws) {
      var response = new ServerResponse(ws.upgradeReq);
      response.writeHead = function (statusCode) {
        if (statusCode > 200) ws.close();
      };
      ws.upgradeReq.method = 'ws';

      app.handle(ws.upgradeReq, response, function(err) {
        var idx = 0;
        (function next (err) {
          if (err) return;
          var cur = middleware[idx++];
          if (!middleware[idx]) {
            cur(ws, ws.upgradeReq);
          } else {
            cur(ws.upgradeReq, response, next);
          }
        }());
      });
    });
  };

  app.ws = addSocketRoute;

  return app
};
