const fileListElement = document.getElementById("file-list");

var ChunkFileUploader = {
  init: function (file, fileIndex) {
    this.blockLength = 1024 * 1024;
    this.retryAfterSeconds = 3;
    this.maxRetries = 3;
    this.currentChunk = 0;
    this.fileToBeUploaded = file;
    this.fileIndex = fileIndex;
    this.size = file.size;
    this.name = file.name;
    this.totalChunks = Math.ceil(file.size / this.blockLength);
    this.tempFileName = "";
    this.isPause = true;
    this.isUploaded = false;

    fileListElement.innerHTML =
      fileListElement.innerHTML +
      `
      <div id="fileupload-item-${fileIndex}" class="fileupload-item">
        <div class="filename-area">
          <p id="display-filename-${fileIndex}" class="filename">${convertFileName(
        file.name
      )}</p>
          <div class="icon-button-group">
            <div
              id="pauseBtn-${fileIndex}"
              class="icon-button tooltip"
              style="display: none"
              onclick="pause(${fileIndex})"
            >
              <i class="fas fa-pause-circle"></i>
            </div>
            <div
              id="resumeBtn-${fileIndex}"
              class="icon-button tooltip"
              onclick="resume(${fileIndex})"
            >
              <i class="fas fa-play-circle"></i>
            </div>
            <div
              id="cancelBtn-${fileIndex}"
              class="icon-button tooltip"
              style="display: none"
              onclick="cancel(${fileIndex})"
            >
              <i class="fas fa-ban"></i>
            </div>
          </div>
        </div>
        <div class="progress-bar">
          <span
            id="progress-bar-${fileIndex}"
            class="progress-bar-fill"
            style="width: 0%"
          ></span>
        </div>
        <div id="errorMsg-${fileIndex}" class="error" style="display: block"></div>
        <div id="successMsg-${fileIndex}" class="success" style="display: none"></div>
      </div>
    `;
  },
  setTempFileName: function (tempFileName) {
    this.tempFileName = tempFileName;
  },
  getCurrentChunk: function () {
    return this.fileToBeUploaded.slice(
      this.currentChunk * this.blockLength,
      (this.currentChunk + 1) * this.blockLength
    );
  },
  pause: function () {
    this.isPause = true;
  },
  resume: function () {
    this.isPause = false;
  },
  nextChunk: function () {
    if (this.totalChunks >= this.currentChunk) {
      document.getElementById(
        `progress-bar-${this.fileIndex}`
      ).style.width = `${(this.currentChunk / this.totalChunks) * 100}%`;
      this.currentChunk++;
    } else {
      this.isPause = true;
      this.isUploaded = true;
      document.getElementById(`successMsg-${this.fileIndex}`).innerHTML =
        "File uploaded successfully";
      document.getElementById(`pauseBtn-${this.fileIndex}`).style.display =
        "none";
      document.getElementById(`resumeBtn-${this.fileIndex}`).style.display =
        "none";
      document.getElementById(`cancelBtn-${this.fileIndex}`).style.display =
        "block";
      console.log(`File ${this.fileIndex} uploaded successfully`);
    }
  },
};

let uploaders = {
  uploaderCollection: [],
  getFiles: function () {
    return this.uploaderCollection
      ?.filter((item) => !item.isPause && item.currentChunk <= item.totalChunks)
      .map((item) => item.getCurrentChunk());
  },
  getFilesInfo: function () {
    return this.uploaderCollection
      ?.filter((item) => !item.isPause && item.currentChunk <= item.totalChunks)
      .map((item) => ({
        currentChunk: item.currentChunk,
        totalChunks: item.totalChunks,
        size: item.size,
        name: item.name,
        tempFileName: item.tempFileName,
        fileIndex: item.fileIndex,
      }));
  },
};

function convertFileName(fileName) {
  let displayFileName = fileName;
  if (fileName.length >= 30) {
    let splitName = fileName.split(".");
    displayFileName =
      splitName[0].substring(0, 30) + "... ." + splitName[splitName.length - 1];
  }
  return displayFileName;
}

const form = document.querySelector("form");
const fileInput = document.querySelector(".file-input");
const fileInfoArea = document.querySelector("#file-info");
let isUploading = false;

function log(msg) {
  console.log(`${new Date()}: ${msg}`);
}

function editfile() {
  fileInput.click();
}

form.addEventListener("click", () => {
  fileInput.click();
});

fileInput.onchange = ({ target }) => {
  form.style.display = "none";
  fileInfoArea.style.display = "block";
  const files = target.files;
  const currentLength = uploaders.uploaderCollection.length;
  for (var i = 0; i < files.length; i++) {
    cful = Object.create(ChunkFileUploader);
    cful.init(files[i], i + currentLength);
    uploaders.uploaderCollection.push(cful);
  }
};

function resume(id) {
  uploaders.uploaderCollection[id].resume();
  document.getElementById(`pauseBtn-${id}`).style.display = "block";
  document.getElementById(`resumeBtn-${id}`).style.display = "none";
  !isUploading && uploadNextChunk();
}

function pause(id) {
  document.getElementById(`pauseBtn-${id}`).style.display = "none";
  document.getElementById(`resumeBtn-${id}`).style.display = "block";
  uploaders.uploaderCollection[id].pause();
}

function cancel(id) {
  document.getElementById(`fileupload-item-${id}`).style.display = "none";
}

function uploadNextChunk() {
  const ableToUploadFiles = uploaders.getFiles();
  const ableToUploadFileInfo = uploaders.getFilesInfo();

  if (ableToUploadFiles.length > 0) {
    const formData = new FormData();
    isUploading = true;

    for (let i = 0; i < ableToUploadFiles.length; i++) {
      formData.append("files", ableToUploadFiles[i]);
    }

    ableToUploadFileInfo.map((item) => {
      resume(item.fileIndex);
    });

    formData.append("fileInfo", JSON.stringify(ableToUploadFileInfo));

    fetch("https://localhost:7250/File/UploadFile", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        const result = JSON.parse(data.res);
        result.map((item) => {
          const id = item.fileIndex;
          uploaders.uploaderCollection[id].setTempFileName(item.tempFileName);
          uploaders.uploaderCollection[id].nextChunk();
          if (item.status === "chunk_file_uploaded") {
            displaySuccessMessage(id, "Uploading...");
          } else if (item.status === "success") {
            displaySuccessMessage(id, item.message);
            document.getElementById(`pauseBtn-${id}`).style.display = "none";
            document.getElementById(`resumeBtn-${id}`).style.display = "none";
            document.getElementById(`cancelBtn-${id}`).style.display = "block";
            console.log(`${item.name} is uploaded successfully!`);
          } else if (item.status === "fail") {
            displayErrorMessage(id, item.message);
            pause(id);
            console.log(`${item.name} uploading failed!`);
          }
        });

        uploadNextChunk();
      })
      .catch((error) => {
        const ableToUploadFileInfo = uploaders.getFilesInfo();
        ableToUploadFileInfo.map((item) => {
          displayErrorMessage(
            item.fileIndex,
            "Unexpected error, please try again!"
          );
          pause(item.fileIndex);
        });
        console.error(error);
        isUploading = false;
      });
  } else {
    isUploading = false;
  }
}

function uploadFile() {
  if (fileInput.files.length > 0) {
    for (let i = 0; i < uploaders.uploaderCollection.length; i++) {
      if (!uploaders.uploaderCollection[i].isUploaded) {
        uploaders.uploaderCollection[i].isPause = false;
      }
    }

    uploadNextChunk();
  } else {
    displayError("Please select file!");
  }
}

function displaySuccessMessage(id, message) {
  document.getElementById(`successMsg-${id}`).innerHTML = message;
  document.getElementById(`successMsg-${id}`).style.display = "block";
  document.getElementById(`errorMsg-${id}`).style.display = "none";
}

function displayErrorMessage(id, message) {
  document.getElementById(`errorMsg-${id}`).innerHTML = message;
  document.getElementById(`errorMsg-${id}`).style.display = "block";
  document.getElementById(`successMsg-${id}`).style.display = "none";
}
