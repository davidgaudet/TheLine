// Server code.
let express = require('express'),
  app = express(),
  http = require('http'),
  socketIo = require('socket.io');

// Start server on port
let server = http.createServer(app);
let io = socketIo.listen(server);
const PORT = process.env.PORT || 8080;
server.listen(PORT);
app.use(express.static(__dirname + '/public'));
console.log("Starting server...");
console.log("Open http://localhost:8080/")

// State info
let path = [{
  x: 0.5,
  y: 0.5
}, {
  x: 0.501,
  y: 0.501
}];
let shapes = [];
let colors = [];
let alphas = [];
let defaultCount = 172800; // Starting time of the reset timer in seconds
let timerCount = defaultCount;
let TimerStarted = false;

// Consts for controlling draw speed
const LINE_COOLDOWN = 180; // Time (in milliseconds) between each new point being sent to clients.
const LINE_SIZE = 0.008; // The size of each line segment (as a fraction of the height/width of canvas).

// Mutex lock & variables to resolve concurrency issues from simultaneous user moves
let lock = false;
const EventEmitter = require('events');
const bus = new EventEmitter();
let moveCount = 0;
let newMoves = [];
//# of connected users
let userCount = 0;

// Handle new users connecting
io.on('connection', function(socket) {
  // Increment if connecting
  userCount++;
  console.log("User connected, count is now : " + userCount);
  io.emit('user_count_changed', userCount);

  // Send all data to new user connecting
  socket.emit('draw_path_and_shapes', shapes, path, colors, alphas);

  // Decrement if disconnecting
  socket.on('disconnect', function() {
    userCount--;
    console.log("User disconnected, count is now : " + userCount);
    io.emit('user_count_changed', userCount);
  });

  // Handle new click from user
  socket.on('new_click', async function lockableMoveHandler(point, color, alpha) {
    moveCount++;
    let tmpMoveCount = moveCount;
    io.emit('show_new_click', point, color);
    if (lock) await new Promise(resolve => bus.once('unlocked', resolve));
    if (tmpMoveCount == moveCount && newMoves.length == 0) {
      lock = true;
      newMoves.push({
        point: point,
        color: color,
        alpha: alpha,
        isNewMove: true
      });
      lock = false;
      bus.emit('unlocked');
    }
  });

  // Start server-side reset timer
  if (TimerStarted == false) {
    TimerStarted = true;
    setInterval(function() {
      io.sockets.emit('reset_counter', timerCount);
      timerCount--;
      if (timerCount == -1) {
        // State info
        path = [{
          x: 0.5,
          y: 0.5
        }, {
          x: 0.501,
          y: 0.501
        }];
        shapes = [];
        colors = [];
        alphas = [];

        timerCount = defaultCount;
        io.sockets.emit('clear_canvas');
      }
    }, 1000);
  }

  //newGalleryEntry(socket, 'David.png', 'November 18th, 2020');
  checkGalleryJson(socket);
});

async function checkGalleryJson(socket) {
  const fs = require('fs');
  fs.readFile('./public/img/gallery/gallery-json.json', 'utf8', (err, jsonString) => {
     if (err) {
        console.log("File read failed: ", err);
        return
     }
     socket.emit('gallery_json_loaded', jsonString);
     console.log('Gallery JSON loaded.');
  })
};

async function newGalleryEntry(socket, name, date) {
  const fs = require('fs');
  fs.readFile('./public/img/gallery/gallery-json.json', 'utf8', (err, jsonString) => {
     if (err) {
        console.log("File read failed: ", err);
        return
     }

     var old_json = JSON.parse(jsonString);
     var new_json = {};

     if (old_json['files_to_load'] == 5) {
        new_json['files_to_load'] = 5;
        new_json['file_1'] = {'file_name' : name, 'date_added' : date};
        new_json['file_2'] = old_json['file_1'];
        new_json['file_3'] = old_json['file_2'];
        new_json['file_4'] = old_json['file_3'];
        new_json['file_5'] = old_json['file_4'];
     }
     else {
        var old_json_count = old_json['files_to_load']
        new_json['files_to_load'] = old_json_count + 1;
        new_json['file_1'] = {'file_name' : name, 'date_added' : date};

        for (let index = 1; index <= old_json_count; index++) {
           new_json['file_' + (index + 1)] = old_json['file_' + index];
        }
     }

     fs.writeFile('./public/img/gallery/gallery-json.json', JSON.stringify(new_json), (err) => {
        if (err) {
           console.log("File read failed: ", err);
        }
     });

     console.log('New gallery entry added to JSON.');

     checkGalleryJson(socket);
  })
}

// Mainloop for sending state changes to clients.
async function mainLoop() {
  if (lock) await new Promise(resolve => bus.once('unlocked', resolve));
  lock = true;
  if (newMoves.length != 0) {
    let tmpMoveCount = moveCount;
    let curMove = newMoves.shift();
    let result = await handleMove(curMove.point);
    if (Array.isArray(result)) {
      let intersect = {
        x: result[0].x,
        y: result[0].y
      };
      path.push(intersect);
      shapes.push(path.splice(result[0].index + 1, path.length - (result[0].index)));
      colors.push(curMove.color);
      path.push(intersect);
      alphas.push(curMove.alpha);
      await wait(LINE_COOLDOWN);
      io.emit('draw_shape', shapes[shapes.length - 1], path, curMove.color, curMove.alpha);
      if (tmpMoveCount == moveCount && newMoves.length == 0) {
        newMoves.push({
          point: result[1],
          color: curMove.color,
          alpha: curMove.alpha,
          isNewMove: false
        });
      }
    } else path.push(result);
  }
  lock = false;
  bus.emit('unlocked');
  setTimeout(mainLoop, 30);
}

// Slowly add lines to extend the path
async function handleMove(point) {
  let tmpMoveCount = moveCount;
  let endPoint = path[path.length - 1];

  let iPoint = findPathIntersect(endPoint, point);

  let oldPoint = {
    x: point.x,
    y: point.y
  };
  if (iPoint != -1) point = {
    x: iPoint.x,
    y: iPoint.y
  };

  let xDist = point.x - endPoint.x;
  let yDist = point.y - endPoint.y;
  let nPieces = Math.sqrt(xDist * xDist + yDist * yDist) / LINE_SIZE;
  let xInc = xDist / nPieces;
  let yInc = yDist / nPieces;
  for (let i = 1; i < nPieces; i++) {
    if (tmpMoveCount != moveCount) return endPoint;
    let nextPoint = {
      x: (endPoint.x + xInc),
      y: (endPoint.y + yInc)
    };
    endPoint = nextPoint;
    io.emit('draw_line', nextPoint);
    await wait(LINE_COOLDOWN);
  }
  if (tmpMoveCount != moveCount) return endPoint;
  io.emit('draw_line', point);
  if (iPoint != -1) return [iPoint, oldPoint];
  return point;
}

// Find where this line (p1A to p1B) intersects the path, and return the intersect point if it exits.
function findPathIntersect(p1A, p1B) {
  const len = path.length;
  if (len < 3) return -1;
  let min1x = Math.min(p1A.x, p1B.x);
  let max1x = Math.max(p1A.x, p1B.x);
  let min1y = Math.min(p1A.y, p1B.y);
  let max1y = Math.max(p1A.y, p1B.y);

  let x1 = p1A.x - p1B.x;
  let y1 = p1B.y - p1A.y;
  let line1 = x1 * p1A.y + y1 * p1A.x;

  let result = {
    index: -1,
    dist: 2,
    x: -1,
    y: -1
  };
  for (let i = len - 3; i >= 1; i--) {
    let p2A = path[i];
    let p2B = path[i + 1];

    let min2x = Math.min(p2A.x, p2B.x);
    let max2x = Math.max(p2A.x, p2B.x);
    let min2y = Math.min(p2A.y, p2B.y);
    let max2y = Math.max(p2A.y, p2B.y);
    if (max1x < min2x || max2x < min1x || max1y < min2y || max2y < min1y) continue;

    let x2 = p2A.x - p2B.x;
    let y2 = p2B.y - p2A.y;
    let line2 = x2 * p2A.y + y2 * p2A.x;
    let det = y1 * x2 - y2 * x1;
    if (det != 0) {
      let x = (line1 * x2 - line2 * x1) / det;
      let y = (line2 * y1 - line1 * y2) / det;
      const E = 0.000000000000001;
      if (Math.max(min1x, min2x) < x + E && x < Math.min(max1x, max2x) + E &&
        Math.max(min1y, min2y) < y + E && y < Math.min(max1y, max2y) + E) {
        let thisDist = Math.sqrt(Math.pow(x - p1A.x, 2) + Math.pow(y - p1A.y, 2));
        if (thisDist < result.dist) result = {
          index: i,
          dist: thisDist,
          x: x,
          y: y
        };
      }
    }
  }
  if (result.index == -1) return -1;
  return result;
}

function wait(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
    }, time);
  });
}

mainLoop();
