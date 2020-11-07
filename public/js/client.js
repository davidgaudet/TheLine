// Client / user / front-end code
let curColor = '#cc4125';

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
  let moveTime = 0; // Clock time when user send a move to the server

  // Info for this user's UI and state
  let socket = io.connect();
  let width = window.innerWidth;
  let height = window.innerHeight * CANVAS_HEIGHT;
  let mouse = {
    click: false,
    pos: { x: 0, y: 0 }
  };
  let canvas = document.getElementById('drawing');
  let context = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;

  // Users local copy of the path and shapes
  let pathCopy = [];
  let shapes = [];
  let shapeColors = [];

  // Display Settings
  let hidePath = false;
  let animating = false;

  
  document.addEventListener('keydown', async function(event) {
    console.log("test2");
    console.log(event.key);

    // Toggle path visibility by pressing 'h'
    if (event.key == 'h') {
      if (hidePath) hidePath = false;
      else hidePath = true;
      drawAll();
    }

    // Animate the history of the drawing by pressing 'a'.
    if (event.key == 'a') {
      animating = true;
      hidePath = true;
      width = window.innerWidth;
      height = window.innerHeight * CANVAS_HEIGHT;
      canvas.width = width;
      canvas.height = height;

      let shapesCopy = Object.assign(shapes);
      let colorsCopy = Object.assign(shapeColors);
      for (let i in shapesCopy) {
        context.fillStyle = colorsCopy[i];
        drawShape(shapesCopy[i]);
        await wait(5000/shapesCopy.length);
      }
      animating = false;
      hidePath = false;
      drawAll();
    }
  });

  // When the user clicks, store their move info
  canvas.onmousedown = function(e) {
    console.log("test");
    if ((Date.now() - moveTime) < current_cooldown) return;
    moveTime = Date.now();
    // Update cooldown
    current_cooldown = COOLDOWN_MINIMUM + COOLDOWN_PER_USER*user_count;

    // "ignore" the Header. Subtract height of header.
    let canvasCoord = e.clientY - (window.innerHeight * HEADER_HEIGHT);
    mouse.pos.x = e.clientX / width;
    mouse.pos.y = (canvasCoord) / height;
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
    user_count = userCount;
    document.getElementById("user-count").innerHTML = "Active Users: " + userCount;
  });

  // Draw everything (from scratch)
  socket.on('draw_path_and_shapes', function(shapesArr, path, colorArr) {
    //if (animating) return;
    shapes = shapesArr;
    pathCopy = path;
    shapeColors = colorArr;
    if (animating) return;
    drawAll();
  });

  // Add new shape
  socket.on('draw_shape', function(shape, path, color) {
    //if (animating) return;
    shapes.push(shape);
    pathCopy = path;
    shapeColors.push(color);
    if (animating) return;
    drawAll();
  });

  // Add line to new point (extend the path)
  socket.on('draw_line', async function(point) {
    let lastPoint = pathCopy[pathCopy.length - 1];
    let xDif = point.x - lastPoint.x;
    let yDif = point.y - lastPoint.y;
    pathCopy.push(point);
    if (hidePath || animating) return;
    drawLine({x: lastPoint.x + xDif / 4, y: lastPoint.y + yDif / 4 });
    await wait(50);
    drawLine({ x: lastPoint.x + xDif / 2, y: lastPoint.y + yDif / 2 });
    await wait(50);
    drawLine({ x: lastPoint.x + 3 * xDif / 4, y: lastPoint.y + 3 * yDif / 4 });
    await wait(50);
    drawLine(point);
  });

  // Show clicks as they're recieved by server
  socket.on('show_new_click', function(point, color) {
    if(color != "white"){
      clickEffect(point.x * width, (point.y * height) + (window.innerHeight * HEADER_HEIGHT), color);
    }
    else{
      clickEffect(point.x * width, (point.y * height) + (window.innerHeight * HEADER_HEIGHT), "grey");
    }
  });


  // Update the reset timer
  socket.on('reset_counter', function(timerCount) {
    var time = parseInt(timerCount, 10);
    var hours = Math.floor(time / 3600);
    var minutes = Math.floor((time - (hours * 3600)) / 60);
    var seconds = time % 60;

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;
    $('p#reset-timer').text(hours + ":" + minutes + ":" + seconds);

    if(timerCount < 300) {
      var color = timerCount % 2 ? 'white' : 'red';
      $('div#reset-timer-div span').css('color', color);
    }
  });

  socket.on('gallery_json_loaded', function(jsonString) {
    var galleryJson = JSON.parse(jsonString);
    // Pass the read json file from the server to the popup.js function
    // This will populate the gallery section of the popup window
    populateGallery(galleryJson);
  });

  // Helper functions for making the actual UI changes

  function drawAll() {
    width = window.innerWidth;
    height = window.innerHeight * CANVAS_HEIGHT;
    canvas.width = width;
    canvas.height = height;
    if (!animating) drawShapes();
    context.beginPath();
    if (!hidePath) drawPath();
  }

  function drawPath() {
    for (let i in pathCopy) drawLine(pathCopy[i]);
  }

  function drawLine(point) {
    if (animating || hidePath) return;
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

  function clickEffect(x, y, color) {
    var d = document.createElement("div");
    d.className = "clickEffect";
    d.style.top = y + "px";
    d.style.left = x + "px";
    document.body.appendChild(d);
    d.addEventListener('animationend', function() {
      d.parentElement.removeChild(d);
    }.bind(this));
    document.querySelector("div.clickEffect").style.borderColor = color;
  }

  function wait(time) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('resolved');
      }, time);
    });
  }

  // setTimeout(function() { alert( "1 minute has passed" ); }, 60000);
  // setTimeout(function() { alert( "5 minutes have passed" ); }, 60000 * 5);
  // setTimeout(function() { alert( "10 minutes have passed" ); }, 60000 * 10);

//   function startTimer(duration, clock) {
//     var timer = duration, minutes, seconds;
//     setInterval(function () {
//         min = parseInt(timer / 60, 10)
//         sec = parseInt(timer % 60, 10);
//         min = minutes < 10 ? "0" + min : min;
//         sec = seconds < 10 ? "0" + sec : sec;
//         if (sec < 10) {
//           clock.textContent = min + ":0" + sec;
//         } else {
//           clock.textContent = min + ":" + sec;
//         }
//         if (--timer < 0) {
//             timer = duration;
//         }
//     }, 1000);
//  }

//  window.onload = function beginTimer() {
//     var tenMinutes = 60 * 10,
//         gameClock = document.querySelector('#timer');
//     startTimer(tenMinutes, gameClock);
//   };


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
