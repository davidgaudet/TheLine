// Client / user / front-end code
let curColor = '#cc4125';
let shapeColors = [];

// var canvas2 = document.getElementById('drawing');
//   var ctx = canvas2.getContext('2d');

// var img1 = new Image();
//   img1.src = 'https://mdn.mozillademos.org/files/222/Canvas_createpattern.png';
//   var pat1 = context.createPattern(img1, 'repeat');


//colors of the rainbow!
let colors = ['#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0', 'white'];

function onColorClick(color) {
  curColor = color;
  console.log("%s", color);
}

function changeColor() {
  var btns = document.getElementsByClassName("button");
  for (var i = 0; i < btns.length; i++) {
    btns[i].style.background = colors[i];
  }
}

function updateSelectedColor(element) {
  $(element).siblings().removeClass('selected-color');
  $(element).addClass('selected-color');
}

// Start of core code for handling changes to the user's UI and state.
document.addEventListener("DOMContentLoaded", function() {

  // Game info
  const HEADER_HEIGHT = 0.1;
  const CANVAS_HEIGHT = 0.9;
  const COOLDOWN_MINIMUM = 850;
  const COOLDOWN_PER_USER = 150; // Increases by 100 ms per new user
  let current_cooldown = 1000;   // Changes as user count increases / decreases
  let user_count = 1;

  // Info for this user's UI and state
  let socket = io.connect();
  let width = window.innerWidth;
  let height = window.innerHeight * CANVAS_HEIGHT;
  let mouse = {
    click: false,
    pos: { x: 0, y: 0 }
  };
  let moveTime = 0; // Clock time when user send a move to the server
  let canvas = document.getElementById('drawing');
  let context = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;

  // Users local copy of the path and shapes
  let pathCopy = []; 
  let shapes = [];

  // When the user clicks, store their move info
  canvas.onmousedown = function(e) {
    if ((Date.now() - moveTime) < current_cooldown) return;
    moveTime = Date.now();
    // Update cooldown
    current_cooldown = COOLDOWN_MINIMUM + COOLDOWN_PER_USER*user_count;
    
    //Essentially, the y coord click on the screen needs to be offset by the height of the header, because
    // y=0 on the Canvas is actually y=79 on just the screen, but we need to "ignore" the Header
    //which is why I subtract height of header (calculated by getting .08 of screen height) from the click
    let canvasCoord = e.clientY - (window.innerHeight * HEADER_HEIGHT);
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

  // Display how long the user needs to wait before their cooldown ends.
  function updateRechargeBar() {
    let timeLeft = Date.now() - moveTime;
    let percentage = (timeLeft / current_cooldown) * 100;
    if (timeLeft <= current_cooldown + 40) {
      bar.set(
        percentage, /* target value. */
        true /* enable animation. default is true */
      );
    }
  }

  // Socket functions. Recieves info from server.

  // Updates the user count in the header
  socket.on('user_count_changed', function(userCount) {
    console.log("user count is " + userCount);
    user_count = userCount;
    document.getElementById("user-count").innerHTML = "Number of connected users : " + userCount;
  });

  // Draw everything (from scratch)
  socket.on('draw_path_and_shapes', function(shapesArr, path, colorArr) {
    shapes = shapesArr;
    pathCopy = path;
    shapeColors = colorArr;
    drawAll();
  });

  // Add new shape
  socket.on('draw_shape', function(shape, path, color) {
    shapes.push(shape);
    pathCopy = path;
    shapeColors.push(color);
    drawAll(color);
  });

  // Add line to new point (extend the path)
  socket.on('draw_line', async function(point) {
    let lastPoint = pathCopy[pathCopy.length - 1];
    let xDif = point.x - lastPoint.x;
    let yDif = point.y - lastPoint.y;
    pathCopy.push(point);
    drawLine({x: lastPoint.x + xDif / 4, y: lastPoint.y + yDif / 4 });
    await wait(50);
    drawLine({ x: lastPoint.x + xDif / 2, y: lastPoint.y + yDif / 2 });
    await wait(50);
    drawLine({ x: lastPoint.x + 3 * xDif / 4, y: lastPoint.y + 3 * yDif / 4 });
    await wait(50);
    drawLine(point);
  });

  // Show clicks as they're recieved by server
  socket.on('show_new_click', function(point) {
    clickEffect(point.x * width, (point.y * height) + (window.innerHeight * HEADER_HEIGHT));
  });

  // Helper functions for making the actual UI changes

  function drawAll() {
    width = window.innerWidth;
    height = window.innerHeight * CANVAS_HEIGHT;
    canvas.width = width;
    canvas.height = height;
    drawShapes();
    context.beginPath();
    drawPath();
  }

  function drawPath() {
    for (let i in pathCopy) drawLine(pathCopy[i]);
  }

  function drawLine(point) {
    context.lineTo(point.x * width, point.y * height);
    context.stroke();
  }

  function drawShapes() {
    for (let i in shapes) {
      context.fillStyle = shapeColors[i];
      drawShape(shapes[i]);
    }
  }

  function drawShape(shape) {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
    context.moveTo(shape[shape.length - 1].x * width, shape[shape.length - 1].y * height);
    for (let i in shape) context.lineTo(shape[i].x * width, shape[i].y * height);
    context.fill();
    context.closePath();
  }

  function clickEffect(x, y) {
    var d = document.createElement("div");
    d.className = "clickEffect";
    d.style.top = y + "px";
    d.style.left = x + "px";
    document.body.appendChild(d);
    d.addEventListener('animationend', function() {
      d.parentElement.removeChild(d);
    }.bind(this));
  }

  function wait(time) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('resolved');
      }, time);
    });
  }

  setTimeout(function() { alert( "1 minute has passed" ); }, 60000);
  setTimeout(function() { alert( "5 minutes have passed" ); }, 60000 * 5);
  setTimeout(function() { alert( "10 minutes have passed" ); }, 60000 * 10);

  function startTimer(duration, clock) {
    var timer = duration, minutes, seconds;
    setInterval(function () {
        min = parseInt(timer / 60, 10)
        sec = parseInt(timer % 60, 10);
        min = minutes < 10 ? "0" + min : min;
        sec = seconds < 10 ? "0" + sec : sec;
        if (sec < 10) {
          clock.textContent = min + ":0" + sec;
        } else {
          clock.textContent = min + ":" + sec;
        }
        if (--timer < 0) {
            timer = duration;
        }
    }, 1000);
 }
 
 window.onload = function beginTimer() {
    var tenMinutes = 60 * 10,
        gameClock = document.querySelector('#timer');
    startTimer(tenMinutes, gameClock);
  };


  // Mainloop, runs every 30 ms.
  async function mainLoop() {
    // Check if the user has clicked to add a line
    changeColor();
    if (mouse.click) {
      socket.emit('new_click', mouse.pos, curColor); // Send point to the server
      mouse.click = false;
    }
    //Allows recharge bar to show current status
    updateRechargeBar();
    // Check if user has changed the size of their browser window
    if (window.innerWidth != width || window.innerHeight * CANVAS_HEIGHT != height) drawAll();
    setTimeout(mainLoop, 30);
  }
  mainLoop();
});
