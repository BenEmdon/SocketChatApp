/**
  @desc This is a node scokect.io server that handles the ChatRoom app
*/

const http = require('http').createServer(handler);
const io = require('socket.io')(http);
const fs = require('fs');
const url = require('url');
const mime = require('mime-types');
const ROOT = './public';
const INDEX = 'index.html'

http.listen(2406);

console.log('Chat server listening on port 2406');

/**
  @desc handles HTTP requests
  @param req - the request
  @param res - the response
*/
function handler(req, res) {
  const filename = ROOT + url.parse(req.url).pathname;
  fs.stat(filename, (err, stats) => {
    if (err) {
      respondErr(err);
    } else if (stats.isDirectory()) { // if directory serve up index.html
      fs.readFile(filename + INDEX, (err, data) => {
        if (err) {
          respondErr(err);
        } else {
          respond(200, data, mime.lookup(filename + INDEX));
        }
      });
    } else {
      fs.readFile(filename, (err, data) => {
        if (err) {
          respondErr(err);
        } else {
          respond(200, data, mime.lookup(filename));
        }
      });
    }
  });

  /**
    @desc responds with the appropriate error given js error
    @param err - the js error
  */
  function respondErr(err) {
		console.log('Handling error: ', err);
		if (err.code === 'ENOENT') {
			serve404();
		} else {
			respond(500, err.message, null);
		}
	}

  /**
    @desc serves up a 404 page
  */
  function serve404() {
		fs.readFile(ROOT + '/404.html', 'utf8', (err, data) => { // arrow functions (ES6)
			if (err) {
        respond(500, err.message, null);
      } else {
        respond(404, data, mime.lookup(filename));
      }
		});
	}

  /**
    @desc responds with the given statusCode, data, and content-type
    @param code - the statusCode
    @param data - the data in some HTTP compatable form
    @param contentType - the content-type to display the data as
  */
  function respond(code, data, contentType) {
    res.writeHead(code, {'content-type': contentType || 'text/html'});
    res.end(data);
  }
}

// MARK: - socket.io events

let clients = []; // list to store the clients in

/**
  @desc on 'connection' -> when a scoket connects
  @param socket - the socket object
*/
io.on('connection', socket => {

  /**
    @desc on 'intro' -> register the socket as a cient and attach its username to it
    @param username - the username to attach to the socket
  */
	socket.on('intro', username => {
		clients.push(socket);
		socket.username = username;
    socket.blockedUsers = [];
    // let everyone but the socket know that the socket has joined
		socket.broadcast.emit('message', `${timestamp()}: ${socket.username} has entered the chatroom.`);
    console.log(`${timestamp()}: ${socket.username} has entered the chatroom.`);
    // welcome socket
		socket.emit('message', `Welcome, ${socket.username}.`);
    // notify everyone of the updated userList
    io.emit('userList', clients.map(client => client.username)); // Arrow functions (ES6) + Higher order function Map
	});

  /**
    @desc on 'message' -> broadcast a message to all the sockets
    @param message - the message to be broadcasted
  */
	socket.on('message', message => {
		socket.broadcast.emit('message',`${timestamp()}, ${socket.username}: ${message}`);
    console.log(`${timestamp()}, ${socket.username}: ${message}`);
	});

  /**
    @desc on 'disconnect' -> remove the socket from the client list and broadcast it's exit
  */
	socket.on('disconnect', () => {
		console.log(`${socket.username} disconnected`);
		io.emit('message', `${timestamp()}: ${socket.username} disconnected.`);
		clients = clients.filter(element => element !== socket); // Arrow functions (ES6) + Higher order function Filter
    io.emit('userList', clients.map(client => client.username));  // Arrow functions (ES6) + Higher order function Map
	});

  /**
    @desc on 'privateMessage' -> relay message data to another socket (but only that socket)
    @param data - contains the username identifying the recieveing socket and the message to send
  */
  socket.on('privateMessage', data => {
    // Find first clients that share the same username.
    const recievingUser = clients.find(client => client.username === data.username);

    if (recievingUser !== undefined) {
      if (recievingUser.blockedUsers.find(username => username === socket.username) === undefined) {
        const newData = {
          username: socket.username,
          message: `${timestamp()}, private message from ${socket.username}:\n${data.message}`
        }
        // emit message only to that socket
        recievingUser.emit('privateMessage', newData);
        console.log(`Private message sent from ${socket.username} to ${data.username}`);
      }
    }
  });

  /**
    @desc on 'blockUser' -> add a username to the sockets blockedUser list
    @param username - username to be added to the blockedUser list
  */
  socket.on('blockUser', username => {
    const blockedUser = socket.blockedUsers.find(user => user === username);
    if (blockedUser === undefined) { // user isnt already blocked -> block user
      socket.blockedUsers.push(username);
      socket.emit('blockUser', `Blocked user: ${username}`);
      console.log(`${socket.username} blocked ${username}`);
    } else { // user is already blocked -> unblock user
      socket.blockedUsers = socket.blockedUsers.filter(user => user !== username); // instead of splice(index, length), filter works cleaner with a similar runtime
      socket.emit('blockUser', `Unblocked user: ${username}`);
      console.log(`${socket.username} unblocked ${username}`);
    }
  });
});

// MARK: - Helper functions

/**
  @desc returns a time sting in the format [h:m:s a](ex. 4:41:35 PM)
*/
function timestamp() {
	return new Date().toLocaleTimeString();
}
