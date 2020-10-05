// Client / user / front-end code
document.addEventListener("DOMContentLoaded", function() {
   
   // Info for this user's UI and state
   let socket = io.connect();
   let width  = window.innerWidth;
   let height = window.innerHeight;
   let mouse  = { 
      click: false,
      pos: {x:0, y:0}
   };
   let moveTime  = 0;   // Clock time when user send a move to the server
   let pathCopy  = [];  // Users local copy of the path
   let shapes    = [];
   let canvas    = document.getElementById('drawing');
   let context   = canvas.getContext('2d');
   canvas.width  = width;
   canvas.height = height;
 
   // When the user clicks, store their move info
   canvas.onmousedown = function(e){ 
      if ((Date.now() - moveTime) < 2000) return;
      moveTime = Date.now();
      mouse.pos.x  = e.clientX / width;
      mouse.pos.y  = e.clientY / height;
      mouse.click  = true; 
   };

   // Draw everything (from scratch)
   socket.on('draw_path_and_shapes', function (shapesArr, path) {
      shapes = shapesArr;
      pathCopy = path;
      drawAll();
   });

   // Draw entire path 
   /*
   socket.on('draw_path', function (path) {
      pathCopy = path;
      drawPath();
   });
   */

   // Add line to new point (extend the path)
   socket.on('draw_line', function (point) {
      pathCopy.push(point);
      drawLine(point);
   });

   // Add shape
   socket.on('draw_shape', function (shape, path) {
      shapes.push(shape);
      pathCopy = path;
      drawAll();
   });

   // Helper functions for making the actual UI changes
   function drawPath() { for (let i in pathCopy) drawLine(pathCopy[i]); }
   function drawLine(point) {
      context.lineTo(point.x * width, point.y * height);
      context.stroke();
   }
   function drawShapes() { for (let i in shapes) drawShape(shapes[i]); }
   function drawShape(shape) {
      context.fillStyle = 'lightblue';
      context.beginPath();
      context.moveTo(shape[shape.length-1].x * width, shape[shape.length-1].y * height);
      for (let i in shape) context.lineTo(shape[i].x * width, shape[i].y * height);
      context.fill();
      context.closePath();
   }
   function drawAll() {
      width  = window.innerWidth;
      height = window.innerHeight;
      canvas.width  = width;
      canvas.height = height;
      drawShapes();
      context.beginPath();
      drawPath();
   }

   // Main loop, runs every 30ms
   async function mainLoop() {
      // Check if the user has clicked to add a line
      if (mouse.click) {   
         socket.emit('new_click', mouse.pos);   // Send point to the server
         mouse.click = false;
      } 
      // Check if user has changed the size of their browser window
      if (window.innerWidth != width || window.innerHeight != height) drawAll();
      setTimeout(mainLoop, 30);
   }
   mainLoop();
});