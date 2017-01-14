/**
  @desc This script manages the DOM of index.html and interactes with the ChatRoom server using socket.io

  Notes:
    * arrow functions used `() => {...}` (ES6)
    * ES6 object creation shortand
*/

const ENTER_EVENT = 13; // constant to check the enter key event

$(document).ready(() => {

  // MARK: - document load script

  const username = prompt('Enter username: ') || 'User';

  const socket = io(); // connect to the server that sent this page

  // MARK: - socket event handlers

  /**
    @desc on 'connection' io event -> enter emit 'intro' event with username
  */
  socket.on('connect', () => {
    socket.emit('intro', username);
  });

  /**
    @desc on 'message' io event -> append the message to the text in the chatLog
    @param message - a message broadcasted to the chatLog
  */
  socket.on('message', message => {
    $('#chatLog').append(`${message}\n`);
    scrolToBottom();
  });

  /**
    @desc on 'userList' io event -> empty userList element and re-add all new <li> elements with jQuery event handlers
    @param users - a list of users identified by their username
  */
  socket.on('userList', function(users) {
    $('#userList').empty();
    users.forEach(user => {
      const listItem = $(`<li>${user}</ul>`);

      /**
        @desc on 'double click' -> start a private message conversation based on the username selected
      */
      listItem.dblclick(function() {
        const userToMessage = $(this).text();
        const displayMessage = `Private message to ${userToMessage}:`;
        privateMessage(displayMessage, userToMessage);
      });

      /**
        @desc on 'click + ctrlKey' or 'click + shiftKey' -> emit to the server with the username on the 'blockUser' event
        @param ev - the event data on the click event
      */
      listItem.click(function(ev) {
        if (ev.ctrlKey || ev.shiftKey) { // use of shiftKey -> because on Mac the control key is a meta key
          const user = $(this).text();
          socket.emit('blockUser', user);
        }
      });
      $('#userList').append(listItem);
    });
  });

  /**
    @desc on 'privateMessage' -> enter a private message chat and display the message sent
    @param data - an object containing the username and message of a private message
  */
  socket.on('privateMessage', data => {
    privateMessage(data.message, data.username);
  });

  /**
    @desc on 'blockUser' -> alert the user of a block status
    @param message - the message to display on the alert
  */
  socket.on('blockUser', message => {
    alert(message);
  });

  // MARK: - jquery event handlers

  /**
    @desc on 'enterKey' while the textInput is focused -> add message to the chatLog and emit the message on the 'message' event
    @param ev - the event data on the kepress event
  */
  $('#inputText').keypress(function(ev) {
    if(ev.which === ENTER_EVENT) {
      socket.emit('message', $(this).val());
      ev.preventDefault();
      $('#chatLog').append(`${(new Date()).toLocaleTimeString()}, ${username}: ${$(this).val()}\n`);
      $(this).val(''); // empty input are afterwards
      scrolToBottom();
    }
  });

  // MARK: - helper functions

  /**
    @desc makes the chat log scroll to the bottom
  */
  function scrolToBottom() {
    $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
  }

  /**
    @desc promts the user with a message and asks for a message to reply/send on the 'privateMessage'
    @param displayMessage - the message to display to the user on the prompt
    @param username - the user identified by their name to send the message to
  */
  function privateMessage(displayMessage, username) {
    const message = prompt(displayMessage);
    console.log(message);
    if (message) {
      const data = { // ES6 object creation shortand
        username,
        message
      }
      socket.emit('privateMessage', data);
    }
  }

  // MARK: - post event listener run script

  $('#inputText').focus(); // focus the text input on document load
});
