'use strict'

const path = require('path');

// import other routes
const uploadRoutes = require('./uploads');
const serveRoutes = require('./serve');
const networkRoutes = require('./network');

const appRouter = (app, fileServer, uploadDir) => {

    // default route
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname + '/../templates/index.html'));
    });

    // other routes
    uploadRoutes(app, uploadDir);
    serveRoutes(app, fileServer);
    networkRoutes(app);
};


module.exports = appRouter;