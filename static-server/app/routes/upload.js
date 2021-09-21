'use strict'

const express = require('express');         // Express Web Server
const fs = require('fs');             // Classic fs
const mv = require('mv');
const { setTimeout } = require('timers');

// the global object for selected folder 
var selectedFolder = null;
var uploadDone = false;
var uploadedFilename = null;


const uploadRoutes = (app, resumable) => {

  // Handle uploads through Resumable.js
  app.post('/setuploadfolder', function (req, res) {
    //console.log(req);
    if (req.body.folder) {
      // set the selected folder
      selectedFolder = req.body.folder;
    }
    else {
      selectedFolder = null;
    }
    res.status(200).send('Folder set: ' + selectedFolder);
  });


  // Handle uploads through Resumable.js
  app.post('/upload', function (req, res) {

    resumable.post(req, function (status, filename, original_filename, identifier) {

      //console.log('POST', status, original_filename, identifier);

      //when all chunks are uploded then status equals to "done" otherwise "partly_done"
      if (status === 'done' && selectedFolder) {
        //console.log(selectedFolder)
        // update global filename
        uploadedFilename = filename;

        //when all chunks uploaded, then createWriteStream to /uploads folder with filename
        var stream = fs.createWriteStream('/tmp-storage/' + filename);

        //stitches the file chunks back together to create the original file. 
        resumable.write(identifier, stream);
        // stream.on('data', function (data) {
        //   //console.log(data)
        // });
        // stream.on('end', function () {
        //   //console.log("end")
        // });
        uploadDone = true;
      }

      if (uploadDone) {
        setTimeout(function () {
          //delete chunks after original file is re-created. 
          resumable.clean(identifier);
        }, 4000);

        setTimeout(function () {
          //delete chunks after original file is re-created. 
          resumable.clean(identifier);
          //move the file to selected folder
          mv('/tmp-storage/' + uploadedFilename, '/usr/src/app/public/storage/' + selectedFolder + "/" + uploadedFilename, function (err) {
            if (err) {
              uploadedFilename = null;
              uploadDone = false;
              throw err
            } else {
              uploadedFilename = null;
              uploadDone = false;
              console.log("Successfully moved the file!");
            }
          });
        }, 5000)
      }

      res.send(status);
    });

  });

  // Handle status checks on chunks through Resumable.js
  app.get('/upload', function (req, res) {
    resumable.get(req, function (status, filename, original_filename, identifier) {
      //console.log('GET', status);
      res.send((status == 'found' ? 200 : 404), status);
    });
  });

};


module.exports = uploadRoutes;