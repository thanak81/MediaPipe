// Copyright 2023 The MediaPipe Authors.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//      http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and

// limitations under the License.
import {
  ObjectDetector,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";
const demosSection = document.getElementById("demos");
let objectDetector;
let runningMode = "IMAGE";
// Initialize the object detector
const initializeObjectDetector = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
  );
  objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
      delegate: "GPU",
    },
    scoreThreshold: 0.5,
    runningMode: runningMode,
    category_deny_list: ["person"],
  });
  demosSection.classList.remove("invisible");
};
initializeObjectDetector();
/********************************************************************
 // Demo 1: Grab a bunch of images from the page and detection them
 // upon click.
 ********************************************************************/
const imageContainers = document.getElementsByClassName("detectOnClick");
for (let imageContainer of imageContainers) {
  imageContainer.children[0].addEventListener("click", handleClick);
}
/**
 * Detect objects in still images on click
 */
async function handleClick(event) {
  const highlighters =
    event.target.parentNode.getElementsByClassName("highlighter");
  while (highlighters[0]) {
    highlighters[0].parentNode.removeChild(highlighters[0]);
  }
  const infos = event.target.parentNode.getElementsByClassName("info");
  while (infos[0]) {
    infos[0].parentNode.removeChild(infos[0]);
  }
  if (!objectDetector) {
    alert("Object Detector is still loading. Please try again.");
    return;
  }
  // if video mode is initialized, set runningMode to image
  if (runningMode === "VIDEO") {
    runningMode = "IMAGE";
    await objectDetector.setOptions({ runningMode: "IMAGE" });
  }
  const ratio = event.target.height / event.target.naturalHeight;
  // objectDetector.detect returns a promise which, when resolved, is an array of Detection objects
  const detections = objectDetector.detect(event.target);
  displayImageDetections(detections, event.target);
  console.log(detections);
}
function displayImageDetections(result, resultElement) {
  const ratio = resultElement.height / resultElement.naturalHeight;
  console.log(ratio);
  for (let detection of result.detections) {
    // Description text
    const p = document.createElement("p");
    p.setAttribute("class", "info");
    p.innerText =
      detection.categories[0].categoryName +
      " - with " +
      Math.round(parseFloat(detection.categories[0].score) * 100) +
      "% confidence.";
    // Positioned at the top left of the bounding box.
    // Height is whatever the text takes up.
    // Width subtracts text padding in CSS so fits perfectly.
    p.style =
      "left: " +
      detection.boundingBox.originX * ratio +
      "px;" +
      "top: " +
      detection.boundingBox.originY * ratio +
      "px; " +
      "width: " +
      (detection.boundingBox.width * ratio - 10) +
      "px;";
    const highlighter = document.createElement("div");
    highlighter.setAttribute("class", "highlighter");
    highlighter.style =
      "left: " +
      detection.boundingBox.originX * ratio +
      "px;" +
      "top: " +
      detection.boundingBox.originY * ratio +
      "px;" +
      "width: " +
      detection.boundingBox.width * ratio +
      "px;" +
      "height: " +
      detection.boundingBox.height * ratio +
      "px;";
    resultElement.parentNode.appendChild(highlighter);
    resultElement.parentNode.appendChild(p);
  }
}
/********************************************************************
 // Demo 2: Continuously grab image from webcam stream and detect it.
 ********************************************************************/
let video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
let enableWebcamButton;
// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
// Keep a reference of all the child elements we create
// so we can remove them easilly on each render.
var children = [];
let results = [];
let newArr=[]

const btnFront = document.querySelector('#btn-front');
const btnBack = document.querySelector('#btn-back');

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}
// Enable the live webcam view and start detection.
async function enableCam(event) {
  if (!objectDetector) {
    console.log("Wait! objectDetector not loaded yet.");
    return;
  }
  // Hide the button.
  enableWebcamButton.classList.add("removed");
  // getUsermedia parameters
  let stream;
  const capture = async facingMode => {
    const constraints ={
        video: {
            facingMode
          },
    }


  
  // Activate the webcam stream.
  try{
    if(stream){
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }
    stream = await navigator.mediaDevices.getUserMedia(constraints);
}catch{(err) => {
        console.error(err);
        /* handle the error */
      }};
        video.srcObject = null;
        video.srcObject = stream;
        video.play();
        video.addEventListener("loadeddata", predictWebcam);
   }

   btnBack.addEventListener('click', () => {
    capture('environment');
  });

  btnFront.addEventListener('click', () => {
    capture('user');
  });

}
let lastVideoTime = -1;
async function predictWebcam() {
  // if image mode is initialized, create a new classifier with video runningMode.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await objectDetector.setOptions({ runningMode: "VIDEO" });
  }
  let startTimeMs = performance.now();
  // Detect objects using detectForVideo.
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const detections = objectDetector.detectForVideo(video, startTimeMs);
    displayVideoDetections(detections);
  }
  // Call this function again to keep predicting when the browser is ready.
  window.requestAnimationFrame(predictWebcam);
}
function displayVideoDetections(result) {
  // Remove any highlighting from previous frame.
  const showResults = document.getElementById("results");
  for (let child of children) {
    liveView.removeChild(child);
  }
  children.splice(0);
  // Iterate through predictions and draw them to the live view
  for (let detection of result.detections) {
    const person = detection.categories[0].categoryName === "person";
    const score = Math.round(parseFloat(detection.categories[0].score) * 100)
    const filteredResult = results.filter((item, index) => {
        return (
          index === results.findIndex((o) => item.categoryName === o.categoryName)
        );
      });
  
    //   newArr = filteredResult.map((arr) => {
    //     return arr.categoryName === "person"
    //       ? { ...arr, content: "This person is Thanak", age: 20 }
    //       : arr;
    //   });

    newArr = filteredResult.map((arr)=>{
        switch(arr.categoryName){
            case "person" :
                return {...arr,content : "This person is Thanak" , age:20}
            case "cell phone":
                return  {...arr,content : "This is Iphone 7 Plus" , age:7}
            default : 
            return arr
        }
    })
      // div.innerText= "Score: "+detection.categories[0].categoryName + " is from Cambodia and Is study in RUPP"
      if(score > 70 && score < 100){
        results.push(detection.categories[0]);
      }
      console.log(newArr)
      
    results.forEach((item) => {
      delete item["score"];
    });
    // console.log(results)
    // console.log(filteredResult)

    const p = document.createElement("p");
    p.setAttribute("class", "displayText");
    p.innerText =
      detection.categories[0].categoryName +
      " - with " +
      Math.round(parseFloat(detection.categories[0].score) * 100) +
      "% confidence.";
    p.style =
      "left: " +
      (video.offsetWidth -
        detection.boundingBox.width -
        detection.boundingBox.originX +
        180) +
      "px;" +
      "top: " +
      detection.boundingBox.originY +
      "px; " +
      "width: " +
      (detection.boundingBox.width - 1200) +
      "px;";
    const highlighter = document.createElement("div");
    highlighter.setAttribute("class", "highlighter");
    highlighter.style =
      "left: " +
      (video.offsetWidth -
        detection.boundingBox.width -
        detection.boundingBox.originX +
        180) +
      "px;" +
      "top: " +
      detection.boundingBox.originY +
      "px;" +
      "width: " +
      (detection.boundingBox.width - 110) +
      "px;" +
      "height: " +
      detection.boundingBox.height +
      "px;";
    liveView.appendChild(highlighter);
    liveView.appendChild(p);
    // Store drawn objects in memory so they are queued to delete at next call.
    children.push(highlighter);
    children.push(p);
  }
  let output="";
        newArr.map((item) => (
          output += `
                ${item.categoryName}
                ${item.content}
                ${item.age}
            `));
        showResults.innerText = output
    
}
