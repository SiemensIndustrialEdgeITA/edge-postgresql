function refreshPage() {
    setInterval(function () {
        window.location.reload();
    }, 1000);
}

function getFilesList() {

    let filesList = $("#fileslist-div").find("ul");
    filesList.html("");
    filesList.empty();

    $.ajax({
        type: 'GET',
        url: '/fileslist',
        dataType: 'json',
        success: function (data) {
            //console.log(data);
            filesList.html("");
            filesList.empty();
            data.files.forEach(function (el) {
                //
                filesList.append("<li>" + el + "</li>");
                //console.log(el);
            });
        }
    });
}

function deleteAllFiles() {

    var isValid = true;
    var options = document.getElementById("backupPathsOption").options;

    for (var i = 0; i < options.length; i++) {
        if ($("#inputDataList").val() != options[i].value) {
            alert('Selected backup path is not in the list!');
            isValid = false;
        }
    }

    if (isValid) {
        $.ajax({
            type: 'GET',
            url: '/filesclean',
            headers: { 'x-foldername': $("#inputDataList").val() },
            success: function (data) {
                //console.log(data)
                refreshPage();
            }
        });
    }
}


// get the model list and populate datalist options for selectors
function populatesFolderDatalists() {

    let dataList = document.getElementById('backupPathsOption');
    $(dataList).html("");
    $(dataList).empty();

    // ajax get to Server API
    $.ajax({
        url: "/dirlist",
        type: 'GET',
        success: function (data) {
            //console.log(data);
            // Loop over array
            data.dirs.forEach(function (fname) {
                // Create a new <option> element.
                let option = document.createElement('option');
                // Set the value using the item in the JSON array.
                option.value = fname;
                // Add the <option> element based on type on the right <datalist>
                dataList.appendChild(option);
            });
        },
        error: function (xhr) {
            console.log(xhr);
        }
    });
};


// validate if selected folder is in the options
function validateSelectedFolder() {

    var isValid = true;
    var options = document.getElementById("backupPathsOption").options;

    var selectedFolder = $("#inputDataList").val()

    for (var i = 0; i < options.length; i++) {
        if (selectedFolder != options[i].value) {
            alert('Selected backup path is not in the list!');
            isValid = false;
        }
    }

    return isValid
};



var r = new Resumable({
    target: '/upload',
    chunkSize: 10 * 1024 * 1024,
    simultaneousUploads: 1,
    testChunks: false,
    throttleProgressCallbacks: 1,
    prioritizeFirstAndLastChunk: true,
    setChunkTypeFromFile: true,
    forceChunkSize: false
});



window.onload = function () {
    getFilesList();
    // get the model list and populate datalist options for selectors
    populatesFolderDatalists();
}


$("#inputDataList").on("change", function (e) {
    e.preventDefault()

    //console.log(this.value)

    if (validateSelectedFolder()) {
        // send data to server API
        $.ajax({
            url: "/setuploadfolder",
            type: "POST",
            data: JSON.stringify({ "folder": this.value }),
            contentType: "application/json",
            success: function (res) {
                //console.log(res);
            },
            error: function (xhr) {
                console.log("error. see details below.");
                console.log(xhr.status + ": " + xhr.responseText);
            },
        }).done(function () {
            console.log("set upload folder done");
        });
    }
})


// Resumable.js isn't supported, fall back on a different method
if (!r.support) {
    $('.resumable-error').show();
} else {
    // Show a place for dropping/selecting files
    $('.resumable-drop').show();
    r.assignDrop($('.resumable-drop')[0]);
    r.assignBrowse($('.resumable-browse')[0]);

    // Handle file add event
    r.on('fileAdded', function (file) {

        //console.log(file.fileName)
        // send if is a valid folder is selected
        if (validateSelectedFolder()) {
            // Show progress pabr
            $('.resumable-progress, .resumable-list').show();
            // Show pause, hide resume
            $('.resumable-progress .progress-resume-link').hide();
            $('.resumable-progress .progress-pause-link').show();
            // Add the file to the list
            $('.resumable-list').append('<li class="resumable-file-' + file.uniqueIdentifier + '">Uploading <span class="resumable-file-name"></span> <span class="resumable-file-progress"></span>');
            $('.resumable-file-' + file.uniqueIdentifier + ' .resumable-file-name').html(file.fileName);
            // Actually start the upload
            r.upload();
        }

    });

    r.on('pause', function () {
        // Show resume, hide pause
        $('.resumable-progress .progress-resume-link').show();
        $('.resumable-progress .progress-pause-link').hide();
    });

    r.on('complete', function () {
        // Hide pause/resume when the upload has completed
        $('.resumable-progress .progress-resume-link, .resumable-progress .progress-pause-link').hide();
        getFilesList();
    });

    r.on('fileSuccess', function (file, message) {
        // Reflect that the file upload has completed
        $('.resumable-file-' + file.uniqueIdentifier + ' .resumable-file-progress').html('(completed)');
        setTimeout(function () { getFilesList() }, 6000);
        setTimeout(function () { getFilesList() }, 10000);
    });

    r.on('fileError', function (file, message) {
        // Reflect that the file upload has resulted in error
        $('.resumable-file-' + file.uniqueIdentifier + ' .resumable-file-progress').html('(file could not be uploaded: ' + message + ')');
        getFilesList();
    });

    r.on('fileProgress', function (file) {
        // Handle progress for both the file and the overall upload
        $('.resumable-file-' + file.uniqueIdentifier + ' .resumable-file-progress').html(Math.floor(file.progress() * 100) + '%');
        $('.progress-bar').css({ width: Math.floor(r.progress() * 100) + '%' });
    });

    r.on('cancel', function () {
        $('.resumable-file-progress').html('canceled');
    });

    r.on('uploadStart', function () {
        // Show pause, hide resume
        $('.resumable-progress .progress-resume-link').hide();
        $('.resumable-progress .progress-pause-link').show();
    });
}
