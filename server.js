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

// Mutex lock & letiables to resolve concurrency issues from simultaneous user moves
let moveCount = 0;
let lock = false;
const EventEmitter = require('events');
const bus = new EventEmitter();

// Slowly add lines to extend the path
async function handleMove(point) {
   let tmpMoveCount = moveCount;
   let tailPoint = path[path.length - 1];
   let xDist = point.x - tailPoint.x;
   let yDist = point.y - tailPoint.y;
   let nPieces = Math.sqrt(xDist*xDist + yDist*yDist) / 0.01;
   let xInc = xDist / nPieces;
   let yInc = yDist / nPieces;
 
   async function addPoint() {
      if (tmpMoveCount != moveCount) return true;
      let nextPoint = { x: (tailPoint.x + xInc), y: (tailPoint.y + yInc) };
      tailPoint = nextPoint;
      io.emit('draw_line', nextPoint);
      await wait(200);
      return false;
   }

   for (let i = 1; i < nPieces; i++) if (await addPoint()) return tailPoint;
   if (tmpMoveCount != moveCount) return tailPoint;
   io.emit('draw_line', point);
   return point;
}

// Handle new users connecting
io.on('connection', function (socket) {
   
   // Send the current path to user
   socket.emit('draw_path', path);

   // Handle new click from user
   socket.on('new_click', async function lockableMoveHandler(point) {
      moveCount++;
      if (lock) await new Promise(resolve => bus.once('unlocked', resolve));
      lock = true;
      path.push(await handleMove(point));
      lock = false;
      bus.emit('unlocked');
   });
});