'use strict'

const path = require('path');
// packages for API Server App
const express = require('express');
const cors = require('cors');
const fs = require('fs')
const https = require('https')
// server for serving static files
const statics = require('node-static');

// the express app
var app = express();

// define some default properties for server
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static('static'));

// the upload folder 
const uploadDir = "./public"

// set public folder for static server
var fileServer = new statics.Server('./public/storage');

// load all API Routes
const router = require('./routes/router.js')(app, fileServer, uploadDir);

console.log(new Date().toISOString(), '- PostgreSQL Static Server v 0.3.0 started!');

// create server HTTPS
const server = https.createServer({
  key: fs.readFileSync('certs/server.key'),
  cert: fs.readFileSync('certs/server.cert')
}, app)
  .listen(5434, function () {
    console.log(new Date().toISOString(), '- Listening on port', server.address().port, "...");
  })

// create server HTTP
// const server = app.listen(5434, () => {
//     console.log('listening on port %s...', server.address().port);
// });
