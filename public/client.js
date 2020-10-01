// Client / user / front-end code
document.addEventListener("DOMContentLoaded", function() {
   
   // Initialize variables for this user
   var pointX,pointY = 0;
   var lastMoveTime  = 0;
   var socket = io.connect();
   var width  = window.innerWidth;
   var height = window.innerHeight;
   var mouse  = { 
      click: false,
      pos: {x:0, y:0}
   };

   // Create canvas
   var canvas    = document.getElementById('drawing');
   var context   = canvas.getContext('2d');
   canvas.width  = width;
   canvas.height = height;
 
   // Set info for the users move
   canvas.onmousedown = function(e){ 
      if ((Date.now() - lastMoveTime) < 2000) return;
      lastMoveTime = Date.now();
      mouse.pos.x  = e.clientX / width;
      mouse.pos.y  = e.clientY / height;
      mouse.click  = true; 
   };

   // Add line to new point (extend the path)
   socket.on('draw_line', function (point) {
      pointX = point.x * width;
      pointY = point.y * height;
      context.lineTo(pointX, pointY);
      context.stroke();
   });
 
   // Draw entire path
   socket.on('draw_path', function (path) {
      for (var i in path) {
         pointX = path[i].x * width;
         pointY = path[i].y * height;
         context.lineTo(pointX, pointY);
         context.stroke();
      }
   });

   // Main loop, runs every 20ms
   async function mainLoop() {
      // Check if the user has clicked to add a line
      if (mouse.click) {
         // Send point to the server
         socket.emit('new_click', mouse.pos);
         mouse.click = false;
      } 

      // Check if user has changed the size of their browser window
      if (window.innerWidth != width || window.innerHeight != height) {
         width  = window.innerWidth;
         height = window.innerHeight;
         canvas.width  = width;
         canvas.height = height;
         pointX = width/2;
         pointY = height/2;
         socket.emit('redraw_path');
      }
      setTimeout(mainLoop, 30);
   }
   mainLoop();
});