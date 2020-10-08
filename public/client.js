// Client / user / front-end code
document.addEventListener("DOMContentLoaded", function() {

  // Info for this user's UI and state
  let socket = io.connect();
  let width = window.innerWidth;
  let height = window.innerHeight * .82;
  let mouse = {
    click: false,
    pos: {
      x: 0,
      y: 0
    }
  };
  let moveTime = 0; // Clock time when user send a move to the server
  let pathCopy = []; // Users local copy of the path
  let shapes = [];
  let canvas = document.getElementById('drawing');
  let context = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;

  // When the user clicks, store their move info
  canvas.onmousedown = function(e) {
    if ((Date.now() - moveTime) < 2000) return;
    moveTime = Date.now();
    //Essentially, the y coord click on the screen needs to be offset by the height of the header, because
    // y=0 on the Canvas is actually y=79 on just the screen, but we need to "ignore" the Header
    //which is why I subtract height of header (calculated by getting .08 of screen height) from the click
    let canvasCoord = e.clientY - (window.innerHeight * .08);
    mouse.pos.x = e.clientX / width;
    mouse.pos.y = (canvasCoord) / height;
    //e.clientY is the y coord relative to the screen;
    // window.innerHeight is actual screen height;
    // height is the height of the canvas;
    // mouse.pos.y is a calculated percentage to show where click is relative to scale of canvas?
    //canvasCoord is the calculated y coordinate relative to the canvas, not the screeen
    mouse.click = true;
    bar.set(
      0, /* target value. */
      false /* enable animation. default is true */
    );

  };

  // Draw everything (from scratch)
  socket.on('draw_path_and_shapes', function(shapesArr, path) {
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
  socket.on('draw_line', function(point) {
    pathCopy.push(point);
    drawLine(point);
  });

  // Add shape
  socket.on('draw_shape', function(shape, path) {
    shapes.push(shape);
    pathCopy = path;
    drawAll();
  });

  // Helper functions for making the actual UI changes
  function drawPath() {
    for (let i in pathCopy) drawLine(pathCopy[i]);
  }

  function drawLine(point) {
    context.lineTo(point.x * width, point.y * height);
    context.stroke();
  }

  function drawShapes() {
    for (let i in shapes) drawShape(shapes[i]);
  }

  function drawShape(shape) {
    context.fillStyle = 'lightblue';
    context.beginPath();
    context.moveTo(shape[shape.length - 1].x * width, shape[shape.length - 1].y * height);
    for (let i in shape) context.lineTo(shape[i].x * width, shape[i].y * height);
    context.fill();
    context.closePath();
  }

  function drawAll() {
    width = window.innerWidth;
    //Allows for me to add a footer & header, breakdown is that header is
    //.08 of page, footer is .1, rest (the canvas) is .82
    //So I made height equal to 82% of screen's height
    height = window.innerHeight * .82;
    canvas.width = width;
    canvas.height = height;
    drawShapes();
    context.beginPath();
    drawPath();
  }

  function updateRechargeBar() {
    let timeLeft = Date.now() - moveTime;
    let percentage = (timeLeft / 2000) * 100;
    if (timeLeft <= 2040) {
      bar.set(
        percentage, /* target value. */
        true /* enable animation. default is true */
      );
    }
  }

  async function mainLoop() {
    // Check if the user has clicked to add a line
    if (mouse.click) {
      socket.emit('new_click', mouse.pos); // Send point to the server
      mouse.click = false;
    }
    //Allows recharge bar to show current status
    updateRechargeBar();
    // Check if user has changed the size of their browser window
    if (window.innerWidth != width || window.innerHeight != height) drawAll();
    setTimeout(mainLoop, 30);
  }
  mainLoop();
});
