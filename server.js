// Server code
var express = require('express'), 
    app = express(),
    http = require('http'),
    socketIo = require('socket.io');

// Start server on port
var server =  http.createServer(app);
var io = socketIo.listen(server);
const PORT = process.env.PORT || 8080;
server.listen(PORT);

// Directory for static files
app.use(express.static(__dirname + '/public'));
console.log("Server running...");

// The path
var line_history = [];

// Event-handler for new users connecting
io.on('connection', function (socket) {

   // Send the current path to user
   for (var i in line_history) {
      socket.emit('draw_line', { line: line_history[i] } );
   }

   // Resend the path to the user (happens if the user changes their window size)
   socket.on('redraw_line', function () {
      for (var i in line_history) {
         socket.emit('draw_line', { line: line_history[i] } );
      }
   });

   // Add handler for message type "draw_line".
   socket.on('draw_line', function (data) {
      // Add received line to history 
      line_history.push(data.line);
      // Send line to all clients
      io.emit('draw_line', { line: data.line });
   });
});