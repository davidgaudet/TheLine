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
console.log("Starting server...");

// The path
var path = [{x: 0.5, y: 0.5},{x: 0.501, y: 0.501}];

// Handle new users connecting
io.on('connection', function (socket) {

   // Send the current path to user
   socket.emit('draw_path', path);

   // Resend the path to the user (happens if the user changes their window size)
   socket.on('redraw_path', function () {
      socket.emit('draw_path', path);
   });

   // Handle new click from user.
   socket.on('new_click', function (point) {
      // Add received line to history 
      path.push(point);
      // Send line to all clients
      io.emit('draw_line', point);
   });
});