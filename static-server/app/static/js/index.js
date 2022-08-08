
// init file global props
var file = null;
var fileChunksLength = 0;
// Set chunk file size to 10MB
var chunkSize = 1024 * 1024 * 10;
var poolTasks = []; //Concurrent pool
var maxTasks = 10; //Maximum concurrency
var finishedTasks = 0; //Quantity completed
var failedTaskList = []; //A list of failures
var startTime = 0; // upload start time
var uploadTime = 0; // progressive time of upload

var actFilesList = [];
var actFilesRows = [];

// the upload progress bar
const progressBar = $("#upload-progress-bar");
// the upload text results
const uploadResults = $("#upload-results");
// the alert container
const alertContainer = $("#alerts-container");


function getFormattedSize(size) {
    // format size value
    let sizeValue = size > 1024 * 1024 * 1024
        ? (size / (1024 * 1024 * 1024)).toFixed(2)
        : size > 1024 * 1024
            ? (size / (1024 * 1024)).toFixed(2)
            : size > 1024
                ? (size / 1024).toFixed(2)
                : size;
    // get size unit
    let sizeUnit = size > 1024 * 1024 * 1024
        ? "GB"
        : size > 1024 * 1024
            ? "MB"
            : size > 1024
                ? "KB"
                : "Bytes";

    return sizeValue + " " + sizeUnit;
}

function getFormattedTime(time) {
    // format size value
    let timeValue = time > 3600
        ? parseInt(time / 3600) + "hours, " + parseInt(time / 60) + " minutes, " + parseInt(time % 60) + " seconds"
        : time > 60
            ? parseInt(time / 60) + " minutes, " + parseInt(time % 60) + " seconds"
            : parseInt(time) + " seconds";

    return timeValue;
}

function sendChunk(fileChunk) {

    return new Promise(async (resolve, reject) => {

        try {
            // create a form 
            let formData = new FormData();
            formData.append("filename", file.name);
            formData.append("hash", fileChunk.hash);
            formData.append("chunk", fileChunk.chunk);

            // Upload API
            let task = axios({
                method: "post",
                url: "/upload",
                data: formData,
            });
            task
                .then((data) => {
                    //Remove the Promise task from the concurrency pool when the request ends
                    let index = poolTasks.findIndex((t) => t === task);
                    poolTasks.splice(index);
                })
                .catch(() => {
                    // push failed chunks to failed list
                    failedTaskList.push(fileChunk);
                })
                .finally(() => {
                    // increment number of finished tasks
                    finishedTasks++;

                    // increment upload time
                    uploadTime = new Date().getTime() - startTime;

                    // update progress bar
                    let progBarPercent = parseInt(finishedTasks / fileChunksLength * 100);
                    progressBar.attr("aria-valuenow", "" + progBarPercent);
                    progressBar.css("width", progBarPercent + "%");
                    progressBar.html(progBarPercent + "%");

                    // calculate uploaded size and remaining time to results
                    let remainingTime = parseInt((fileChunksLength - finishedTasks) * (uploadTime / finishedTasks) / 1000);
                    let sizeUploaded = finishedTasks * chunkSize;
                    // get size of file formatted
                    let sizeUploadedWithUnit = getFormattedSize(sizeUploaded);
                    let remainingTimeWithUnit = getFormattedTime(remainingTime);
                    let actResults = uploadResults.html().split("</p>")[0] + "</p>";
                    uploadResults.html(actResults + "<p>Uploaded " + sizeUploadedWithUnit + ", " + remainingTimeWithUnit + " remaining..</p>");

                    resolve();
                });

            // push the task in the pool
            poolTasks.push(task);

            if (poolTasks.length === maxTasks) {
                //Each time the concurrent pool finishes running a task, another task is plugged in
                await Promise.race(poolTasks);
            }
        }
        catch (err) {
            reject(err);
        }
    });
}

function fileSplitAndSend() {

    return new Promise(async (resolve, reject) => {

        try {
            // init index of chunks
            let chunkIndex = 0;

            // calculate num of chunks
            fileChunksLength = math.ceil(file.size / chunkSize);

            // set start time
            startTime = new Date().getTime();
            taskTime = 0;

            // for each chunk size of the file
            for (let cur = 0; cur < file.size; cur += chunkSize) {

                // create a chunk object
                let fileChunk = {
                    hash: chunkIndex++,
                    chunk: file.slice(cur, cur + chunkSize),
                };

                // upload the chunk
                await sendChunk(fileChunk);
            }

            // if there are any failed tasks, upload them again
            if (failedTaskList.length > 0) {
                // deep copy failed task list and reset it
                let prevFailedTaskList = JSON.parse(JSON.stringify(failedTaskList));
                failedTaskList = [];
                for (let i = 0; i < prevFailedTaskList.length; i++) {
                    await sendChunk(prevFailedTaskList[i]);
                }
            }

            resolve();
        }
        catch (err) {
            reject(err);
        }
    });
}

function fileUpload() {

    // reset global vars
    poolTasks = [];
    finishedTasks = 0;
    failedTaskList = [];

    // get size of file formatted
    let fileSizeWithUnit = getFormattedSize(file.size);

    // append to results
    uploadResults.html("<p>Uploading file <strong>" + file.name + "</strong> with size " + fileSizeWithUnit + "...</p>");

    // call split and send file
    fileSplitAndSend()
        .then(() => {
            //All requests are requested complete
            if (finishedTasks === fileChunksLength) {

                // set progress bar
                progressBar.attr("aria-valuenow", "99");
                progressBar.css("width", "99%");
                progressBar.html("99%");

                // show success message
                uploadResults.html("<p>Uploading file <strong>" + file.name + "</strong> finished in "
                    + getFormattedTime((new Date().getTime() - startTime) / 1000)
                    + ". Wait for the file to be processed on server...</p>");

                //All tasks complete, merge slices
                axios({
                    method: "get",
                    url: "/merge",
                    params: {
                        filename: file.name,
                        chunksLen: fileChunksLength
                    },
                })
                    .then((data) => {
                        //console.log("Upload completed.");

                        // set progress bar
                        progressBar.attr("aria-valuenow", "100");
                        progressBar.css("width", "100%");
                        progressBar.html("100%");
                        progressBar.removeClass("progress-bar-animated");

                        // show success message
                        uploadResults.html("<p>Successfully uploaded file <strong>" + file.name + "</strong> in "
                            + getFormattedTime((new Date().getTime() - startTime) / 1000)
                            + ".</p>");

                        // show info alert
                        alertContainer.append(['<div class="alert alert-info alert-dismissible fade show" role="alert" id="alert-uploadfile">',
                            'File uploaded successfully!',
                            '</div>'].join(""));
                        setTimeout(function () {
                            $("#alert-uploadfile").alert("close");
                        }, 5000);

                        // get files in the storage directory
                        getFilesList();

                    })
                    .catch(() => {
                        // show error message
                        uploadResults.html("<p>Failed uploading file <strong>" + file.name + "</strong></p>");
                        progressBar.removeClass("progress-bar-animated");
                    });
            }
            else {
                // show error message
                uploadResults.html("<p>Failed uploading file <strong>" + file.name + "</strong></p>");
                progressBar.removeClass("progress-bar-animated");

            }
        })
        .catch(() => {
            // show error message
            uploadResults.html("<p>Failed uploading file <strong>" + file.name + "</strong></p>");
            progressBar.removeClass("progress-bar-animated");
        });
}

// get list of file in the storage folder
function getFilesList() {

    // get the file list object
    let filesList = $("#files-list");

    // empty the file list object
    //filesList.html("");

    // ajax get file list to Server API
    $.ajax({
        type: "GET",
        url: "/fileslist",
        dataType: "json",
        success: function (data) {
            //console.log(data);

            // remove from actual list files that not exists
            actFilesList.forEach(function (file, index) {
                if (data.files.indexOf(file) == -1) {
                    actFilesList.splice(index, 1);
                    actFilesRows.splice(index, 1);
                }
            })


            // loop over file array
            data.files.forEach(function (el) {
                //console.log(el);
                // search if file is not already in the list
                if (actFilesList.indexOf(el) === -1) {
                    // escape / as %2F
                    let fileParam = el.replace(/\//g, "%2F");
                    // get filename
                    let fileName = el.split("/")[el.split("/").length - 1];

                    // generate file row with downloadable file
                    let fileRow =
                        '<li class="list-group-item">' +
                        '<div class="d-flex flex-row justify-content-center">' +
                        '<div class="px-2 mx-2">' +
                        '<a href="/files/' +
                        fileParam +
                        '" download="' +
                        fileName +
                        '">' +
                        fileName +
                        "</a>" +
                        '</div>' +
                        '<div class="px-2 mx-2">' +
                        '<a href="javascript:void(0)" onClick="deleteFile(\'' +
                        fileParam +
                        '\')">' +
                        '<i class="fa-solid fa-trash">' +
                        '</i>' +
                        '</a>' +
                        '</div>' +
                        '</div>' +
                        "</li>";

                    // append to lists
                    actFilesList.push(el);
                    actFilesRows.push(fileRow);
                }
            });

            // set html
            filesList.html(actFilesRows);

        },
    });
}

// delete all files in the storage folder
function deleteAllFiles() {

    // get if a backup path is selected
    var isValid = validateSelectedBackupPath();

    if (isValid) {
        // call ajax to delete all files in the selected folder
        $.ajax({
            type: "GET",
            url: "/cleanall",
            headers: { "x-foldername": $("#backup-path-input").val() },
            success: function (data) {
                //console.log(data)
                refreshPage();
            },
        });
    }
}

// delete all files in the storage folder
function deleteFile(fileParam) {

    // get if a backup path is selected
    // call ajax to delete all files in the selected folder
    $.ajax({
        type: "GET",
        url: "/clean/" + fileParam,
        success: function (data) {
            //console.log(data)
            refreshPage();
            // show info alert
            alertContainer.append(['<div class="alert alert-info alert-dismissible fade show" role="alert" id="alert-deletefile">',
                'File deleted successfully!',
                '</div>'].join(""));
            setTimeout(function () {
                $("#alert-deletefile").alert("close");
            }, 5000);
        },
    });
}

// get the model list and populate datalist options for selectors
function populatesFolderDatalists() {
    // get folder options list
    let dataList = document.getElementById("backup-path-options");
    $(dataList).html("");

    // ajax get to Server API
    $.ajax({
        url: "/dirlist",
        type: "GET",
        success: function (data) {
            //console.log(data);
            // Loop over array
            data.dirs.forEach(function (fname) {
                // Create a new <option> element.
                let option = document.createElement("option");
                // Set the value using the item in the JSON array.
                option.value = fname;
                // Add the <option> element based on type on the right <datalist>
                dataList.appendChild(option);
            });
        },
        error: function (xhr) {
            console.log(xhr);
        },
    });
}

// validate if selected backup path is in the options
function validateSelectedBackupPath() {
    // init valid flag
    var isValid = true;
    // get the selected backup path options
    var options = document.getElementById("backup-path-options").options;
    // get the selected backup path
    var selectedFolder = $("#backup-path-input").val();
    // loop over options
    for (var i = 0; i < options.length; i++) {
        // if selected backup path is not in the list
        if (selectedFolder != options[i].value) {
            // set valid flag to false
            isValid = false;
            // show error alert
            alertContainer.append(['<div class="alert alert-danger alert-dismissible fade show" role="alert" id="alert-nopath">',
                'Selected backup path is not in the list!',
                '</div>'].join(""));
            setTimeout(function () {
                $("#alert-nopath").alert("close");
            }, 5000);
        }
    }

    return isValid;
}

// refresh page
function refreshPage() {
    setInterval(function () {
        window.location.reload();
    }, 1000);
}


$(document).ready(function () {

    // hide upload file input object
    $('#upload-file-input').hide();

    // hide progress bar
    $("#upload-progress-bar-div").hide();

    // get files in the storage directory
    getFilesList();

    // get the model list and populate datalist options for selectors
    populatesFolderDatalists();

    // on change of backup path selector
    $("#backup-path-input").on("change", function (e) {

        e.preventDefault();
        //console.log(this.value)

        // if a valid backup path is selected
        if (validateSelectedBackupPath()) {

            // send selected backup path to server API
            $.ajax({
                url: "/setuploadfolder",
                type: "POST",
                data: JSON.stringify({ folder: this.value }),
                contentType: "application/json",
                success: function (res) {
                    //console.log(res);
                },
                error: function (xhr) {
                    console.log("error. see details below.");
                    console.log(xhr.status + ": " + xhr.responseText);
                },
            }).done(function () {
                //console.log("set upload folder done.");
                // enable upload button
                $('#upload-button').prop('disabled', false);
                // enable delete all button
                $('#delete-all-button').prop('disabled', false);

                // get files in the storage directory
                getFilesList();
            });
        }
        else {
            // disable upload button
            $('#upload-button').prop('disabled', true);
            // disable delete all button
            $('#delete-all-button').prop('disabled', true);
        }
    });


    // on click upload button
    $('#upload-button').on("click", function () {
        // trigger upload file input object with a click
        $('#upload-file-input').click();
    });

    // on change upload file input
    $('#upload-file-input').on("change", function (event) {

        if (validateSelectedBackupPath()) {

            // reset progress bar
            progressBar.attr("aria-valuenow", "0");
            progressBar.css("width", "0%");
            progressBar.html("0%");
            progressBar.addClass("progress-bar-animated");
            // reset results
            uploadResults.empty();

            // check if file is selected
            if (event.target.files.length == 0) {
                // show error alert
                alertContainer.append(['<div class="alert alert-danger alert-dismissible fade show" role="alert" id="upload-alert-nofile">',
                    'No file selected! Please select a file to upload.',
                    '</div>'].join(""));
                setTimeout(function () {
                    $("#upload-alert-nofile").alert("close");
                }, 5000);
                // disable upload button
                $('#upload-button').prop('disabled', true);
                // disable delete all button
                $('#delete-all-button').prop('disabled', true);
            }
            else {
                // get file object
                file = event.target.files[0];

                // show progress bar
                $("#upload-progress-bar-div").show();

                // call upload function
                fileUpload();
            }
        }
        else {
            // show error alert
            alertContainer.append(['<div class="alert alert-danger alert-dismissible fade show" role="alert" id="alert-nopath-upload">',
                'Please select a valid backup path to upload the file!',
                '</div>'].join(""));
            setTimeout(function () {
                $("#alert-nopath-upload").alert("close");
            }, 5000);
        }

    });

});
