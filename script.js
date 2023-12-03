const form = document.querySelector("form");
const fileInput = document.querySelector(".file-input");
const fileInfoArea = document.querySelector("#file-info");
const pFileName = document.querySelector("#display-filename");
const progressBar = document.querySelector("#progress-bar");
const progressArea = document.querySelector(".progress-area");
const uploadedArea = document.querySelector(".uploaded-area");
const errorMsg = document.querySelector("#errorMsg");
const successMsg = document.querySelector("#successMsg");
const cancelBtn = document.querySelector("#cancelBtn");
const resumeBtn = document.querySelector("#resumeBtn");

const chunkSize = 1024 * 1024;
let totalChunks = 0;
let currentChunk = 0;
let file = null;
let disableUpload = false;

function displayError(msg) {
  errorMsg.innerHTML = msg;
  successMsg.style.display = "none";
  errorMsg.style.display = "block";
}

function displaySuccess(msg) {
  successMsg.innerHTML = msg;
  successMsg.style.display = "block";
  errorMsg.style.display = "none";
}

function log(msg) {
  console.log(`${new Date()}: ${msg}`);
}

function updateElements(keyword) {
  if (keyword === "chunk_upload_failed" || keyword === "network_eror") {
    uploadBtn.style.display = "none";
    cancelBtn.style.display = "block";
    resumeBtn.style.display = "block";
  } else if (keyword === "cancel") {
    successMsg.style.display = "none";
  } else if (keyword === "success") {
    uploadBtn.style.display = "none";
    cancelBtn.style.display = "none";
    resumeBtn.style.display = "none";
  } else {
    successMsg.style.display = "none";
    errorMsg.style.display = "none";
    uploadBtn.style.display = "block";
    cancelBtn.style.display = "none";
    resumeBtn.style.display = "none";
    progressBar.style.width = `0%`;
  }
}

function editfile() {
  fileInput.click();
}

form.addEventListener("click", () => {
  fileInput.click();
});

fileInput.onchange = ({ target }) => {
  disableUpload = false;
  file = target.files[0];
  totalChunks = Math.ceil(file.size / chunkSize);
  currentChunk = 0;
  updateElements();
  if (file) {
    let fileName = file.name;
    if (fileName.length >= 35) {
      let splitName = fileName.split(".");
      fileName =
        splitName[0].substring(0, 35) +
        "... ." +
        splitName[splitName.length - 1];
    }

    form.style.display = "none";
    fileInfoArea.style.display = "block";
    progressBar.style.width = `0%`;
    pFileName.innerHTML = fileName;
  }
};

function resume() {
  displaySuccess("Trying again...");
  uploadNextChunk();
}

function cancel() {
  totalChunks = 0;
  currentChunk = 0;
  file = null;
  updateElements();
  pFileName.innerHTML = "";
  const fileInput = document.getElementById("file-input");
  fileInput.value = "";
}

function uploadNextChunk() {
  if (file) {
    const chunk = file.slice(
      currentChunk * chunkSize,
      (currentChunk + 1) * chunkSize
    );

    const formData = new FormData();
    formData.append("file", chunk);
    formData.append("fileName", file.name);
    formData.append("totalBytes", file.size);
    formData.append("currentChunk", currentChunk);
    formData.append("totalChunks", totalChunks);

    progressBar.style.width = `${(currentChunk / totalChunks) * 100}%`;

    fetch("https://localhost:7250/File/UploadFile", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "chunk_file_uploaded") {
          if (data.currentChunk === currentChunk) {
            currentChunk++;
            displaySuccess("Uploading...");
            log(`Chunk ${currentChunk} has been uploaded!`);
            uploadNextChunk();
          } else {
            const msg =
              "Unexpected error, please try again by click 'Resume' button";
            displayError(msg);
            log(msg);
          }
        } else if (data.status === "failed") {
          displayError(data.message);
          log(data.message);
        } else if (data.status === "success") {
          disableUpload = true;
          progressBar.style.width = `100%`;
          displaySuccess(data.message);
          log(data.message);
        }
      })
      .catch((error) => {
        updateElements("network_eror");
        displayError("Unexpected error, please check your network connection!");
        console.error(error);
      });
  }
}

function uploadFile() {
  if (disableUpload) {
    displaySuccess("Please change file!");
    return;
  }

  if (fileInput.files.length > 0) {
    displaySuccess("Trying to connect server...");
    const fileInput = document.getElementById("file-input");
    file = fileInput.files[0];
    totalChunks = Math.ceil(file.size / chunkSize);
  
    uploadNextChunk();
  } else {
    displayError("Please select file!")
  }
}
