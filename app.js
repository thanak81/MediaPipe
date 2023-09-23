import {
  ObjectDetector,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";
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
};
initializeObjectDetector();

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
const btnStop = document.querySelector("#btn-stop");

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
        video.srcObject = stream;
        video.play();
        video.addEventListener("loadeddata", predictWebcam);
   }

   
   btnBack.addEventListener('click', () => {
    capture('environment');
    btnBack.classList.add("removed")
  });

  btnFront.addEventListener('click', () => {
    capture('user');
  });
  btnStop.addEventListener("click",()=>{
    if(stream){
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
  }else{
    console.log("Webcam is alredy closed")
  }
  })

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
        detection.boundingBox.originX + 140) +
      "px;" +
      "top: " +
      detection.boundingBox.originY +
      "px; " +
      "width: " +
      (detection.boundingBox.width - 50) +
      "px;";
    const highlighter = document.createElement("div");
    highlighter.setAttribute("class", "highlighter");
    highlighter.style =
      "left: " +
      (video.offsetWidth -
        detection.boundingBox.width -
        detection.boundingBox.originX +140) +
      "px;" +
      "top: " +
      detection.boundingBox.originY +
      "px;" +
      "width: " +
      (detection.boundingBox.width-50) +
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
        newArr.map((item) => {
          return output += `
          <div class="results-card">
                <div>Category: ${item.categoryName}</div>
                <div>Description: ${item.content}</div>
                <div>Age: ${item.age}</div>
                <div>
                  <span><a href="#">Facebook</a></span>
                  <span><a href="#">Twitter</a></span>
                  <span><a href="#">Instagram</a></span>
                  <span><a href="#">Linkedin</a></span>
                </div>
          </div>`
          });
  showResults.innerHTML = output

}

// let v = document.getElementById("webcam");

// v.addEventListener(
//   "resize",
//   (ev) => {
//     let w = v.videoWidth;
//     let h = v.videoHeight;

//     if (w && h) {
//       v.style.width = w;
//       v.style.height = h;
//     }
//   },
//   false,
// );