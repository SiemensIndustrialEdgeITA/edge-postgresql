'use strict'

const fs = require('fs');
const path = require('path');


function getFilesRecursively(files, directory) {
  const filesInDirectory = fs.readdirSync(directory);
  //console.log(filesInDirectory);
  for (const file of filesInDirectory) {
    const absolute = path.join(directory, file);
    //console.log(absolute);
    if (fs.statSync(absolute).isDirectory()) {
      getFilesRecursively(files, absolute);
    } else {
      files.push(absolute.replace("/usr/src/app/public/", ""));
    }
  }
};

const serveRoutes = (app, fileServer) => {

  // SERVE FILE FROM PUBLIC FOLDER
  app.get('/files/:filename', function (req, res) {

    // get file name
    let filename = req.params["filename"];
    // serve the requested file
    fileServer.serveFile(filename.replace("storage", ""), 200, {}, req, res);
    console.log(new Date().toISOString(), "- Serving file", filename, "successfully.");

  });

  // SERVE FILE LIST IN PUBLIC FOLDER
  app.get('/fileslist', function (req, res) {
    let files = [];
    getFilesRecursively(files, "/usr/src/app/public/storage");
    let bodyRes = { "files": files };
    //console.log(bodyRes);
    res.status(200).send(bodyRes);
  });

  // SERVE FILE LIST IN PUBLIC FOLDER
  app.get('/dirlist', function (req, res) {
    let bodyRes = { "dirs": [] };
    fs.readdirSync("/usr/src/app/public/storage").forEach((file, index) => {
      const stat = fs.statSync("/usr/src/app/public/storage/" + file);
      const isDir = stat.isDirectory();
      if (isDir) {
        bodyRes.dirs.push(file);
      }
    });
    //console.log(bodyRes);
    res.status(200).send(bodyRes);
  });

  // DELETE ALL FILES IN PUBLIC FOLDER
  app.get('/cleanall', function (req, res) {
    let foldername = req.headers["x-foldername"];
    //console.log(req)
    // delete all files in backup dump backup folder
    fs.readdirSync("/usr/src/app/public/storage/" + foldername).forEach((file, index) => {
      // delete file
      fs.unlinkSync(path.join("/usr/src/app/public/storage", foldername, file));
    });

    res.status(200).send({ "msg": "All files in " + foldername + " deleted successfully." });
  });

  // DELETE A FILE IN PUBLIC FOLDER
  app.get('/clean/:filename', function (req, res) {

    // get file name
    let filename = req.params["filename"];
    //console.log(req)

    // delete file
    fs.unlinkSync(path.join("/usr/src/app/public/", filename));

    res.status(200).send({ "msg": "File " + filename + " deleted successfully." });
  });
};

module.exports = serveRoutes;