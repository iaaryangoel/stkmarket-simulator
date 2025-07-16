/* ───────────────────────────── server.js ───────────────────────────── */
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const dotenv   = require('dotenv');
const cors     = require('cors');
const connectDB = require('./config/db');

/* Controllers that need io */
const { setIO: setShareIO } = require('./controllers/shareController');
const { setIO: setNewsIO }  = require('./controllers/newsController');

dotenv.config();
connectDB();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

/* ----------- ROUTES ----------- */
app.use('/api/users',  require('./routes/userRoutes'));
app.use('/api/shares', require('./routes/shareRoutes'));
app.use('/api/news',   require('./routes/newsRoutes'));
app.use('/api/trade',  require('./routes/tradeRoutes'));

app.get('/', (_, res) => res.send('API is running...'));

/* ----------- SOCKET.IO ----------- */
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET','POST','DELETE'] }
});

app.set('io', io);              // ✅ make io available via req.app.get('io')
setShareIO(io);                 // ShareController socket setup
setNewsIO(io);                  // NewsController socket setup

io.on('connection', (socket) => {
  console.log('⚡ client connected:', socket.id);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server & WS running on ${PORT}`));
