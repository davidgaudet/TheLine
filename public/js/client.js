// Client / user / front-end code
let curColor = '#cc4125';

//colors of the rainbow!
let colors = ['#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0', 'white'];

let currentAlpha = 1;
let alphaValues = [];

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
  const COOLDOWN_PER_USER = 150; // Increases by 150 ms per new user
  let current_cooldown = 1000; // Changes as user count increases / decreases
  let user_count = 1;
  let moveTime = 0; // Clock time when user send a move to the server

  // Info for this user's UI and state
  let socket = io.connect();
  let width = window.innerWidth;
  let height = window.innerHeight * CANVAS_HEIGHT;
  let mouse = {
    click: false,
    pos: {
      x: 0,
      y: 0
    }
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
  let patterns = false;


  document.addEventListener('keydown', async function(event) {
    if (animating) return;

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
      let alphaCopy = Object.assign(alphaValues);
      for (let i in shapesCopy) {
        if (patterns) context.fillStyle = createPat(colorsCopy[i], i, i);
        else context.fillStyle = colorsCopy[i];
        context.globalAlpha = alphaCopy[i];
        drawShape(shapesCopy[i]);
        context.globalAlpha = 1;
        await wait(5000 / shapesCopy.length);
      }
      animating = false;
      hidePath = false;
      drawAll();
    }
  });

  // When the user clicks, store their move info
  canvas.onmousedown = function(e) {
    if ((Date.now() - moveTime) < current_cooldown) return;
    moveTime = Date.now();
    // Update cooldown
    current_cooldown = COOLDOWN_MINIMUM + COOLDOWN_PER_USER * user_count;

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
    $('#cooldown-holder').text( ((COOLDOWN_MINIMUM + COOLDOWN_PER_USER * user_count) / 1000).toFixed(2) + 's');
  });

  // Draw everything (from scratch)
  socket.on('draw_path_and_shapes', function(shapesArr, path, colorArr, alphas) {
    shapes = shapesArr;
    pathCopy = path;
    shapeColors = colorArr;
    alphaValues = alphas;
    if (animating) return;
    drawAll();
  });

  // Add new shape
  socket.on('draw_shape', function(shape, path, color, alpha) {
    shapes.push(shape);
    pathCopy = path;
    shapeColors.push(color);
    alphaValues.push(alpha);
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
    drawLine({
      x: lastPoint.x + xDif / 4,
      y: lastPoint.y + yDif / 4
    });
    await wait(50);
    drawLine({
      x: lastPoint.x + xDif / 2,
      y: lastPoint.y + yDif / 2
    });
    await wait(50);
    drawLine({
      x: lastPoint.x + 3 * xDif / 4,
      y: lastPoint.y + 3 * yDif / 4
    });
    await wait(50);
    drawLine(point);
  });

  // Show clicks as they're recieved by server
  socket.on('show_new_click', function(point, color) {
    if (color == "white") color = "grey";
    clickEffect(point.x * width, (point.y * height) + (window.innerHeight * HEADER_HEIGHT), color);
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
    $('p#reset-timer').text("Reset - " + hours + ":" + minutes + ":" + seconds);

    if (timerCount < 300) {
      var color = timerCount % 2 ? 'white' : 'red';
      $('div#menu-reset-timer-div p').css('color', color);
    }
  });

  // Handle the reset timer running out, reload page
  socket.on('clear_canvas', function() {
    // Reload page to mirror that shapes and path have been reset
    location.reload();
  });

  socket.on('gallery_json_loaded', function(jsonString) {
    var galleryJson = JSON.parse(jsonString);
    // Pass the read json file from the server to the popup.js function
    // This will populate the gallery section of the popup window
    populateGallery(galleryJson);
  });

  // Helper functions for making the actual UI changes

  function drawAll() {
    if (animating) return;
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
      if (patterns) context.fillStyle = createPat(shapeColors[i], i, i);
      else context.fillStyle = shapeColors[i];
      let alpha = alphaValues[i];
      drawShape(shapes[i], alpha);
    }
  }

  function drawShape(shape, alpha) {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
    context.moveTo(shape[shape.length - 1].x * width, shape[shape.length - 1].y * height);
    for (let i in shape) context.lineTo(shape[i].x * width, shape[i].y * height);
    context.globalAlpha = alpha;
    context.fill();
    context.globalAlpha = 1;
    context.closePath();
  }

  function createPat(color, arc, rect) {
    var canvasPattern = document.createElement("canvas");
    canvasPattern.width = 10;
    canvasPattern.height = 10;
    var contextPattern = canvasPattern.getContext("2d");
    contextPattern.fillStyle = color;
    contextPattern.fillRect(0, 0, canvas.width, canvas.height);

    // draw a pattern on an off-screen canvas
    contextPattern.beginPath();
    contextPattern.strokeRect(2, 2, 10, 10);
    contextPattern.arc(arc%10, arc%10, 3, 0, Math.PI);
    contextPattern.rect(rect%10, rect%10, 1, 1);
    contextPattern.arc(arc%10, arc%10, 3, 0, Math.PI);
    contextPattern.stroke();
    var pattern = context.createPattern(canvasPattern,"repeat");
    context.fillStyle = pattern;

    return pattern;
  }

  function drawHeart() {
    var canvas = document.createElement('canvas');
    if (canvas.getContext) {
      var ctx = canvas.getContext('2d');
  
      // Cubic curves example
      ctx.beginPath();
      ctx.moveTo(75, 40);
      ctx.bezierCurveTo(75, 37, 70, 25, 50, 25);
      ctx.bezierCurveTo(20, 25, 20, 62.5, 20, 62.5);
      ctx.bezierCurveTo(20, 80, 40, 102, 75, 120);
      ctx.bezierCurveTo(110, 102, 130, 80, 130, 62.5);
      ctx.bezierCurveTo(130, 62.5, 130, 25, 100, 25);
      ctx.bezierCurveTo(85, 25, 75, 37, 75, 40);
      ctx.fill();
      var pattern = context.createPattern(ctx,"repeat");
      context.fillStyle = pattern;

      return pattern;
    }
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

  //handles transparency toggler
  document.getElementById('transparent').oninput = function transparancyToggler() {
    var result = document.getElementById("transparent").value;
    currentAlpha = result / 100;
    currentAlpha = 1.01 - currentAlpha;
    console.log("Current transparent val is " + currentAlpha);
    document.getElementById('trans-amount').innerHTML = "Transparency: " + (result) + "%";

  }

  function wait(time) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('resolved');
      }, time);
    });
  }

  // Mainloop, runs every 30 ms.
  async function mainLoop() {
    // Check if the user has clicked to add a line
    changeColor();
    if (mouse.click) {
      socket.emit('new_click', mouse.pos, curColor, currentAlpha); // Send point to the server
      mouse.click = false;
    }

    //Allows recharge bar to show current status
    updateRechargeBar();

    // Check if user has changed the size of their browser window
    if (window.innerWidth != width || window.innerHeight * CANVAS_HEIGHT != height) drawAll();

    // Check if user has toggled patterns.
    var checkbox = document.querySelector('input[type="checkbox"]');
    if ((checkbox.checked && !patterns) || (!checkbox.checked && patterns)) {
      patterns = !patterns;
      drawAll();
    } 

    setTimeout(mainLoop, 30);
  }
  mainLoop();
});
