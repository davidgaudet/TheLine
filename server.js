// Server code
let express = require('express'), 
    app = express(),
    http = require('http'),
    socketIo = require('socket.io');

// Start server on port
let server =  http.createServer(app);
let io = socketIo.listen(server);
const PORT = process.env.PORT || 8080;
server.listen(PORT);
app.use(express.static(__dirname + '/public'));
console.log("Starting server...");

function wait(time) {
   return new Promise(resolve => { setTimeout(() => { resolve('resolved'); }, time); });
}

// The path
let path = [{x: 0.5, y: 0.5},{x: 0.501, y: 0.501}];
let shapes = [];
let colors = [];

// Mutex lock & letiables to resolve concurrency issues from simultaneous user moves
let moveCount = 0;
let lock = false;
const EventEmitter = require('events');
const bus = new EventEmitter();

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
   let line1 = x1*p1A.y + y1*p1A.x;

   let result = {index: -1, dist: 2, x: -1, y: -1};
   for (let i = len-3; i >= 1; i--) {
      let p2A = path[i];
      let p2B = path[i+1];

      let min2x = Math.min(p2A.x, p2B.x);
      let max2x = Math.max(p2A.x, p2B.x);
      let min2y = Math.min(p2A.y, p2B.y);
      let max2y = Math.max(p2A.y, p2B.y);
      if (max1x < min2x || max2x < min1x || max1y < min2y || max2y < min1y) continue;

      let x2 = p2A.x - p2B.x;
      let y2 = p2B.y - p2A.y;
      let line2 = x2*p2A.y + y2*p2A.x;
      let det = y1*x2 - y2*x1;
      if (det != 0) {
         let x = (line1*x2 - line2*x1)/det;
         let y = (line2*y1 - line1*y2)/det;
         const E = 0.000000000000001
         if (Math.max(min1x, min2x) < x + E && x < Math.min(max1x, max2x) + E &&
             Math.max(min1y, min2y) < y + E && y < Math.min(max1y, max2y) + E) {
            let thisDist = Math.sqrt(Math.pow(x-p1A.x,2)+Math.pow(y-p1A.y,2));
            if (thisDist < result.dist) result = {index: i, dist: thisDist, x: x, y: y};
         }
      }
   }
   if (result.index == -1) return -1;
   return result;
}

// Slowly add lines to extend the path
async function handleMove(point) {
   let tmpMoveCount = moveCount;
   let endPoint = path[path.length - 1];

   let iPoint = findPathIntersect(endPoint, point);
   let oldPoint = {x: point.x, y: point.y};
   if (iPoint != -1) point = {x: iPoint.x, y: iPoint.y};

   let xDist = point.x - endPoint.x;
   let yDist = point.y - endPoint.y;
   let nPieces = Math.sqrt(xDist*xDist + yDist*yDist) / 0.01;
   let xInc = xDist / nPieces;
   let yInc = yDist / nPieces;
   for (let i = 1; i < nPieces; i++) {
      if (tmpMoveCount != moveCount) return endPoint;
      let nextPoint = { x: (endPoint.x + xInc), y: (endPoint.y + yInc) };
      endPoint = nextPoint;
      io.emit('draw_line', nextPoint);
      await wait(200);
   }
   if (tmpMoveCount != moveCount) return endPoint;
   io.emit('draw_line', point);
   if (iPoint != -1) return [iPoint, oldPoint];
   return point;
}

// Handle new users connecting
io.on('connection', function (socket) {

   // Send all data to new user connecting
   socket.emit('draw_path_and_shapes', shapes, path, colors);

   // Handle new click from user
   socket.on('new_click', async function lockableMoveHandler(point, color) {
      moveCount++;
      if (lock) await new Promise(resolve => bus.once('unlocked', resolve));
      lock = true;
      let tmpMoveCount = moveCount;
      let result = await handleMove(point);
      if (Array.isArray(result)) {
         let intersect = {x: result[0].x, y: result[0].y};
         path.push(intersect);
         shapes.push(path.splice(result[0].index+1, path.length-(result[0].index)));
         colors.push(color);
         path.push(intersect);
         io.emit('draw_shape', shapes[shapes.length-1], path, color);
         if (tmpMoveCount == moveCount) {
            lock = false;
            bus.emit('unlocked');
            return lockableMoveHandler(result[1]);
         }
      } else path.push(result);
      lock = false;
      bus.emit('unlocked');
   });
});