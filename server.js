var express = require('express');
  var app = express();
  var http = require('http').Server(app);
  var io = require('socket.io')(http);
  var port = process.env.PORT || 3000;
  
  http.listen(port, function () {
    console.log('Server listening on port :', port);
  });
  
  app.use('/js',  express.static(__dirname + '/public/js'));
  app.use('/css', express.static(__dirname + '/public/css'));
  app.use(express.static(__dirname + '/public'));
  
  
  var usernames = {};
  var sockets = {};
  
  io.on('connection', function (socket) {
    var addedUser = false;
    
 // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
      // we store the username in the socket session for this client
      socket.username = username;
      // add the client's username to the global list
      sockets[socket.username] = socket;
      usernames[username] = username;
      addedUser = true;
      socket.emit('login', {
        list: Object.keys(usernames)
      });
      // echo globally (all clients) that a person has connected
      socket.broadcast.emit('user joined', {
        username: socket.username,
        list: Object.keys(usernames)
      });
    });
    
  
    // when the client emits 'new message', this listens and executes
    socket.on('chat message', function (data) {
      // we tell the client to execute 'new message'
      socket.broadcast.emit('chat message', {
        username: socket.username,
        message: data,
        timestamp: Date.now()
      });
      console.log('Message sent');
    });
    
socket.on('private chat', function(data){
	if(data.msgTo in usernames && data.msgTo != socket.username){
		if(data.msgTo in sockets){
    		console.log(socket.username +' whispers to ' +data.msgTo + ' und sagt ' +data.message);

			sockets[data.msgTo].emit('chat message', {
				username: socket.username,
				message:data.message,
				timestamp:Date.now()
			});
    		
	}}
		
    	console.log('privat gechattet');
    });
 
  
    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
      // remove the username from global usernames list
      if (addedUser) {
        delete usernames[socket.username];
  
        // echo globally that this client has left
        socket.broadcast.emit('user left', {
          username: socket.username,
        });
      }
    });
  });