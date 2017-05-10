
var express = require('express');
  var app = express();
// var http = require('http').Server(app);

  var fs = require('fs');
  var bodyParser = require('body-parser');
  var helper = require('./helper.js');
  var helmet = require('helmet');
  
  var server = require('http').createServer(app);
  var io = require('socket.io').listen(server,{transports:['websocket']});
  var router = require('./router')(io);
  var config = require('./config.json');
  var cfenv = require('cfenv');
  var appEnv = cfenv.getAppEnv();
  var Cloudant = require('cloudant');
  var services;
  var cloudant;
  var database;
  var redis = require('redis');

var client = redis.createClient(12168, 'pub-redis-12168.dal-05.1.sl.garantiadata.com', {no_ready_check: true});
client.auth('p4yTvCGWTxMhOwfU', function (err){
	if (err) throw err;
});

client.on('connect', function(){
	console.log('Connected to Redis');
});

  var userSelector = {
		    "selector": {
		        "_id": ""
		    }  
		};
  
  init();
  
  app.use(helmet());
  app.use(helmet.contentSecurityPolicy({
      directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
          fontSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
          connectSrc: ["'self'", "ws://" + appEnv.url.replace('https://', '')]
      },
      browserSniff: false,
      setAllHeaders: true
  }));
  app.use(helmet.hsts({
    maxAge: 604800,
    force: true,
      preload: true,
      fore: true
  }))
  app.use(helmet.referrerPolicy({ 
      policy: 'same-origin' 
  }));
  app.use(helmet.xssFilter());
  app.enable('trust proxy');
  app.use(bodyParser.json()); // for parsing application/json
  app.use('/', router);

  app.use(express.static(__dirname + '/public'));
	  app.use('/js',  express.static(__dirname + '/public/js'));
	  app.use('/css', express.static(__dirname + '/public/css'));
  
  app.enable('trust proxy');
  
  
  server.listen(appEnv.port || config.port, function() {
	    console.log("server listening on " + appEnv.url);
	  });
  
  var usernames = {};
  var sockets = {};
  
  io.on('connection', function (socket) {
    var addedUser = false;
    
 // when the client emits 'add user', this listens and executes
    socket.on('add user', function (data) {
    	userSelector.selector._id = data.user;
    	var salt = helper.generateSalt();
        var hashedPassword = helper.hashPassword(data.password, salt);
        
    	database.find(userSelector, function(error, dataDB) {
            if (error) {

            	console.log("neuer user registrieren");
            	// we store the username in the socket session for this client
                socket.username = data.name;
                // add the client's username to the global list
                sockets[socket.username] = socket;
                usernames[data.name] = data.name;
                addedUser = true;
                 
                    database.insert({_id: data.user, password: hashedPassword, salt: salt}, function(error, body) {
                        if (!error) {
                            console.log("user inserted in db");
                        } 
                        
                        socket.emit('login', {
                            list: Object.keys(usernames)
                          });
                        // echo globally (all clients) that a person has connected
                        socket.broadcast.emit('user joined', {
                          username: socket.username,
                          list: Object.keys(usernames)
                        });
                    });  
            } else if(userSelector in usernames){
            	console.log("User ist vorhanden!");
            	socket.username = data.name;
                // add the client's username to the global list
                sockets[socket.username] = socket;
                usernames[data.name] = data.name;
                addedUser = true;
               
                socket.emit('login', {
                    list: Object.keys(usernames)
                  });
                // echo globally (all clients) that a person has connected
                socket.broadcast.emit('user joined', {
                  username: socket.username,
                  list: Object.keys(usernames)
                });
                
            	
                  
            }  else{
            	socket.emit('alert');
                	
                }
    	});

  });
    
  
    // when the client emits 'new message', this listens and executes
    socket.on('chat message', function (data) {

      
    	io.emit('chat message', {
    		username: socket.username,
    		message: data,
    		timestamp: Date.now()
    	});
    	console.log('Message sent');
    });
    
socket.on('private chat', function(data){
	if(data.msgTo in usernames && data.msgTo in sockets){
		if(data.msgTo!= socket.username){
    		console.log(socket.username +' whispers to ' +data.msgTo + ' und sagt ' +data.message);

			sockets[data.msgTo].emit('chat message', {
				username: socket.username,
				message:data.message,
				timestamp:Date.now(),
				privat:true
			});
			sockets[socket.username].emit('chat message', {
				username: socket.username,
				message:'@'+data.msgTo+' '+data.message,
				timestamp:Date.now(),
				privat:true,
				
			});
    		
		}else{
			sockets[socket.username].emit('self message');
			
		}
	}else{
		sockets[socket.username].emit('wrong user', {
			username: data.msgTo
		});
	}
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
  
  function init() {
      /*
		 * Search for the cloudant service.
		 */
      if (process.env.VCAP_SERVICES) {
          services = JSON.parse(process.env.VCAP_SERVICES);
          // Search for available cloudant services.
          var cloudantService = services['cloudantNoSQLDB'];
          for (var service in cloudantService) {
              if (cloudantService[service].name === 'chatappservice') {
                  cloudant = Cloudant(cloudantService[service].credentials.url);
              }    
          }
      
      }else {
    	  console.log("neue db angelegt");
      	    var cloudant = Cloudant({
      	    	"username": "6ecc929f-5f73-456f-87c8-d69bf2f8f4ea-bluemix",
      	         "password": "cf10ed7805bd6b80e6d9e071ef075b922acc6fa6c5b7f446604193b5b134a51f",
      	         "host": "6ecc929f-5f73-456f-87c8-d69bf2f8f4ea-bluemix.cloudant.com",
      	         "port": 443,
      	         "url": "https://6ecc929f-5f73-456f-87c8-d69bf2f8f4ea-bluemix:cf10ed7805bd6b80e6d9e071ef075b922acc6fa6c5b7f446604193b5b134a51f@6ecc929f-5f73-456f-87c8-d69bf2f8f4ea-bluemix.cloudant.com"
      	    });
      	    		
      }
       database = cloudant.db.use('cloudcomputingchatapp');
       if (database === undefined) {
       console.log("ERROR: The database with the name 'cloudcomputingchatapp' is not defined. You have to define it before you can use the database.");
       }
  }
