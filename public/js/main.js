$(function() {
	var FADE_TIME = 150; // ms
	var TYPING_TIMER_LENGTH = 400; // ms
	var passwordRegex = /.{6,}/;
	var usernameRegex = /[0-9a-zA-Z]{3,}/;
	// Initialize varibles
	var $window = $(window);
	var $usernameInput = $('.usernameInput'); // Input for username
	var $passwordInput = $('.passwordInput');
	var $messages = $('.messages'); // Messages area
	var $inputMessage = $('.inputMessage'); // Input message input box

	var $loginPage = $('.login.page'); // The login page
	var $chatPage = $('.chat.page'); // The chatroom page

	// Prompt for setting a username
	var password;
	var username;
	var connected = false;
	var typing = false;
	var lastTypingTime;
	var $currentInput = $usernameInput.focus();
	var privat = false;

	var socket = io();

	// Sets the client's username
	function setUsername() {
		username = cleanInput($usernameInput.val().trim());

		// If the username is valid
		if (username) {
			

			$passwordInput.show();
			$currentInput = $passwordInput.focus();

		}
	}
	
	function setPassword() {
		password = cleanInput($passwordInput.val().trim());

		if ( password) {

			$loginPage.fadeOut();
			$chatPage.show();
			$loginPage.off('click');
			$currentInput = $inputMessage.focus();
			// Tell the server your username
			socket.emit('add user', {
				name : username,
				password : password
			});
		}else{
			alert("der geht nix rein" +password);
		}

	}

	function updateUsersOnline(data, options) {
		var message = '';

		message += 'Users online: ' + data.list;

		log(message);
	}
	
	function checkPassword(){
		
	}

	// Sends a chat message
	function sendMessage() {
		var message = $inputMessage.val();

		message = cleanInput(message);
		// when there's a message and a socket connection
		if (message && connected) {
			$inputMessage.val('');

			var pmsg = message.trim();

			if (pmsg.substr(0, 1) === '@') {
				pmsg = pmsg.substr(1);
				var index = pmsg.indexOf(' ');
				if (index !== -1) {
					var name = pmsg.substring(0, index);
					var msg = pmsg.substring(index + 1);

					socket.emit('private chat', {
						msgTo : name,
						message : msg
					});
					privat = true;
				}

			} else {

				// tell server to execute 'chat message'
				socket.emit('chat message', message);
			}
		}
	}

	// Log a message
	function log(message, options) {
		var $el = $('<li>').addClass('log').text(message);
		addMessageElement($el, options);
	}

	// Adds the visual chat message to the message list
	function addChatMessage(data, options) {

		var $timestampDiv = $('<span class="timestamp"/>').text(
				formatDate(data.timestamp));
		var $usernameDiv = $('<span class="username"/>').text(data.username);

		if (data.privat) {
			var $messageBodyDiv = $('<span class="privateMessageBody"/>').text(
					data.message);
		} else {

			var $messageBodyDiv = $('<span class="messageBody"/>').text(
					data.message);
		}
		var $messageDiv = $('<li class="message"/>').data('username',
				data.username).append($usernameDiv, $messageBodyDiv).append(
				$timestampDiv, $messageBodyDiv);

		addMessageElement($messageDiv, options);

	}

	// Adds a message element to the messages and scrolls to the bottom
	// el - The element to add as a message
	// options.fade - If the element should fade-in (default = true)
	// options.prepend - If the element should prepend
	// all other messages (default = false)
	function addMessageElement(el, options) {
		var $el = $(el);

		// Setup default options
		if (!options) {
			options = {};
		}
		if (typeof options.fade === 'undefined') {
			options.fade = true;
		}
		if (typeof options.prepend === 'undefined') {
			options.prepend = false;
		}

		// Apply options
		if (options.fade) {
			$el.hide().fadeIn(FADE_TIME);
		}
		if (options.prepend) {
			$messages.prepend($el);
		} else {
			$messages.append($el);
		}
		$messages[0].scrollTop = $messages[0].scrollHeight;
		privat = false;
	}

	// Prevents input from having injected markup
	function cleanInput(input) {
		return $('<div/>').text(input).text();
	}

	function formatDate(dateObj) {
		var d = new Date(dateObj);
		var hours = d.getHours();
		var minutes = d.getMinutes().toString();

		return "[" + hours + ":"
				+ (minutes.length === 1 ? '0' + minutes : minutes) + "]";
	}

	// Updates the typing event
	function updateTyping() {
		if (connected) {
			if (!typing) {
				typing = true;
			}
			lastTypingTime = (new Date()).getTime();

			setTimeout(function() {
				var typingTimer = (new Date()).getTime();
				var timeDiff = typingTimer - lastTypingTime;
				if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
					typing = false;
				}
			}, TYPING_TIMER_LENGTH);
		}
	}

	// Keyboard events

	$window.keydown(function(event) {
		// Auto-focus the current input when a key is typed
		if (!(event.ctrlKey || event.metaKey || event.altKey)) {
			$currentInput.focus();
		}
		// When the client hits ENTER on their keyboard
		if (event.which === 13) {
			if (username && password) {
				sendMessage();
				typing = false;
			} else if(username){
				setPassword();
			}
			else{
				setUsername();
			}
		}
	});

	$inputMessage.on('input', function() {
		updateTyping();
	});

	// Click events

	// Focus input when clicking anywhere on login page
	$loginPage.click(function() {
		$currentInput.focus();
	});

	// Focus input when clicking on the message input's border
	$inputMessage.click(function() {
		$inputMessage.focus();
	});

	// Socket events

	// Whenever the server emits 'login', log the login message
	socket.on('login', function(data) {
		connected = true;
		// Display the welcome message
		var message = "Welcome to the ChatApp";
		log(message, {
			prepend : true
		});
		updateUsersOnline(data);
	});

	// Whenever the server emits 'new message', update the chat body
	socket.on('chat message', function(data) {
		addChatMessage(data);
	});

	socket.on('wrong user', function(data) {
		var message = "The user " + data.username + " does not exist!";
		log(message);
	});

	socket.on('self message', function(data) {
		var message = "You can't send a private message to yourself!";
		log(message);
	});

	// Whenever the server emits 'user joined', log it in the chat body
	socket.on('user joined', function(data) {
		log(data.username + ' joined');
		updateUsersOnline(data);
	});

	// Whenever the server emits 'user left', log it in the chat body
	socket.on('user left', function(data) {
		log(data.username + ' left');
		updateUsersOnline(data);
	});
	
	socket.on('alert', function(){
		alert("not valid");
	});
});
