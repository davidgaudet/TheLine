// Client / user / front-end code
document.addEventListener("DOMContentLoaded", function() {
   var mouse = { 
      click: false,
      pos: {x:0, y:0},
      pos_prev: false
   };

   // Create canvas
   var canvas  = document.getElementById('drawing');
   var context = canvas.getContext('2d');
   var width   = window.innerWidth;
   var height  = window.innerHeight;
   var socket  = io.connect();
 
   // Start with a point in the center
   var pointX = width/2;
   var pointY = height/2;

   context.beginPath();
   context.moveTo(pointX, pointY);
   context.lineTo(pointX+1, pointY);
   context.stroke();
   pointX = pointX + 1;

   // Set canvas to full browser width/height
   canvas.width = width;
   canvas.height = height;
 
   canvas.onmousedown = function(e){ 
      mouse.pos.x = e.clientX / width;
      mouse.pos.y = e.clientY / height;
      mouse.click = true; 
   };

   // Usage TBD
   //canvas.onmouseup = function(e) {};
   //canvas.onmousemove = function(e) {};
 
   // Add new line segment received from server
   socket.on('draw_line', function (data) {
      var line = data.line;
      context.moveTo(pointX, pointY);
      pointX = line[0].x * width;
      pointY = line[0].y * height;
      context.lineTo(pointX, pointY);
      context.stroke();
   });

   function wait2Seconds() {
      return new Promise(resolve => {
         setTimeout(() => {
            resolve('resolved');
         }, 2000);
      });
   }

   // Main loop, runs every 20ms
   async function mainLoop() {
      // Check if the user has clicked to add a line
      if (mouse.click) {
         // Send line to to the server
         socket.emit('draw_line', { line: [ mouse.pos, mouse.pos_prev ] });
         await wait2Seconds(); // Todo: replace this with something that doesn't pause all the clients code
         mouse.click = false;
      }
      mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y};

      // Check if user has changed the size of their browser window
      if (window.innerWidth != width || window.innerHeight != height) {
         width = window.innerWidth;
         height = window.innerHeight;
         canvas.width = width;
         canvas.height = height;
         pointX = width/2;
         pointY = height/2;
         socket.emit('redraw_line');
      }
      setTimeout(mainLoop, 20);
   }
   mainLoop();
});