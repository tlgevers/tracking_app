//
// # SimpleServer
//

var stores = require("st.json");
var master = require("st.json");
console.log("store", stores[0].store, stores[0].city);


var fs = require('fs');
var http = require('http');
var path = require('path');
var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];

io.on('connection', function (socket) {

    stores.forEach(function (data) {
      socket.emit('stores', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('checked', function (i) {
      var status = stores[i].check;
      if (status == true) {
        stores[i].check = false;
      } else {
        stores[i].check = true;
      }
      var color = stores[i].color;
      if (color == "danger") {
        stores[i].color = "success";
      } else {
        stores[i].color = "danger";
      }
      if (stores[i].check == true) {
        var date = new Date();
        stores[i].contact_date = date;
      } else {
        var date = null;
        stores[i].contact_date = null;
      }

      var data = {
        index: i,
        contact_date: date
      }

      broadcast('status', data);
    });

    socket.on('adding', function(cap) {
      var msg = String(cap.comment);
      var person = String(cap.contacted_by);

      if (!msg)
        return;

      var data = {
        index: cap.index,
        contacted_by: person,
        comment: msg
      }

      broadcast('contacted', data);
      stores[cap.index].comment = cap.comment;
      stores[cap.index].contacted_by = cap.contacted_by;
    });

    socket.on('reset', function () {
      for (var i = 0; i < stores.length; i++) {
        stores[i].check = false;
        stores[i].comment = "";
        stores[i].contact_date = "";
        stores[i].contacted_by = "";
        stores[i].color = "danger";
      }
      stores.forEach(function (data) {
          socket.emit('stores', data);

      });
      broadcast('reload');
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {

    var active_users = sockets.length;

    //console.log("active users: ", active_users);
    broadcast('roster', active_users);

}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 1000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
