'use strict'

const fs = require('fs');
const multiparty = require('multiparty');
const path = require('path');
const mv = require('mv');

// the global object for selected folder 
var selectedFolder = null;


const uploadRoutes = (app, uploadPath) => {

    // file path
    const STATIC_FILES = path.join(uploadPath, 'tempfiles');
    // Temporary path to upload files
    const STATIC_TEMPORARY = path.join(uploadPath, 'tempchunks');

    // set the selected folder for upload
    app.post('/setuploadfolder', function (req, res) {
        //console.log(req);
        if (req.body.folder) {
            // set the selected folder
            selectedFolder = req.body.folder;
            console.log(new Date().toISOString(), "- Folder set: ", selectedFolder);
        }
        else {
            selectedFolder = null;
        }
        res.status(200).send('Folder set: ' + selectedFolder);
    });

    // Interface for uploading slices
    app.post('/upload', (req, res) => {

        // Create multiparty form
        const form = new multiparty.Form();

        // parse incoming form
        form.parse(req, function (err, fields, files) {
            // get chunk file name, hash and data
            let filename = fields.filename[0];
            let hash = fields.hash[0];
            let chunk = files.chunk[0];
            //console.log(filename, hash, chunk);

            // init chunk file temp dir
            let chunkDir = path.join(STATIC_TEMPORARY, filename);

            if (Number(hash) == 0) {
                console.log(new Date().toISOString(), "- Request for uploading file", filename, "received.")
            }

            try {
                // create chunk file path if not exist
                if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });
                // open chunk file buffer
                const buffer = fs.readFileSync(chunk.path);
                // write chunk file with hash as name
                const ws = fs.createWriteStream(path.join(chunkDir, hash));
                ws.write(buffer);
                ws.close();

                // send response
                res.send({ "filename": filename, "hash": hash, "status": "success" });

            } catch (error) {
                // send response error
                console.error(new Date().toISOString(), "-", error);
                res.status(500).send({ "filename": filename, "hash": hash, "status": "error", "error": error });
            }
        })
    })

    //Merged slice interface
    app.get('/merge', async (req, res) => {

        try {
            // get filename and chunksLen from request
            let { filename, chunksLen } = req.query;
            chunksLen = Number(chunksLen);

            if (filename && chunksLen) {

                // get file chunk path
                let tmpFilePath = path.join(STATIC_TEMPORARY, filename);

                // check if file path exist
                if (!fs.existsSync(STATIC_FILES)) fs.mkdirSync(STATIC_FILES, { recursive: true });

                // Create final File
                let filePath = path.join(STATIC_FILES, filename);
                fs.writeFileSync(filePath, '');

                for (let i = 0; i < chunksLen; i++) {
                    // get chunk path
                    let actChunkPath = path.join(tmpFilePath, i.toString());
                    // Append Write to File
                    fs.appendFileSync(filePath, fs.readFileSync(actChunkPath));
                    // Delete chunk used this time
                    fs.unlinkSync(actChunkPath);
                }
                console.log(new Date().toISOString(), "- Chunks of File", filename, "merged succesfully.");
                fs.rmdirSync(tmpFilePath);
                console.log(new Date().toISOString(), "- Temporary folder", tmpFilePath, "deleted successfully.");

                if (selectedFolder) {
                    //move the file to selected folder
                    mv(filePath, path.join('/usr/src/app/public/storage/', selectedFolder, filename), function (err) {
                        if (err) {
                            throw err
                        } else {
                            console.log(new Date().toISOString(), "- Successfully moved the file to folder", selectedFolder);
                        }
                    });
                }

                // send response
                res.send({ "filename": filename, "status": "success" });
            }
            else {
                // if no filename or chunksLen respond error
                res.status(500).send({ "filename": filename, "status": "error", "error": "Missing filename or chunksLen." });
            }

        } catch (error) {
            console.error(new Date().toISOString(), " - ", error);
            res.status(500).send({ "filename": filename, "status": "error", "error": error });
        }
    })
};

module.exports = uploadRoutes;