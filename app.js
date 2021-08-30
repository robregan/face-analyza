const express = require("express");
const app = express();
const multer = require("multer");
const upload = multer({
  storage: multer.diskStorage({}),
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      cb(new Error("File type is not supported"), false);
      return;
    }
    cb(null, true);
  },
});

//MS Specific
const axios = require("axios").default;
const async = require("async");
const fs = require("fs");
const https = require("https");
const path = require("path");
const createReadStream = require("fs").createReadStream;
const sleep = require("util").promisify(setTimeout);
const ComputerVisionClient =
  require("@azure/cognitiveservices-computervision").ComputerVisionClient;
const ApiKeyCredentials = require("@azure/ms-rest-js").ApiKeyCredentials;

require("dotenv").config({ path: "./config/.env" });

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const key = process.env.MS_COMPUTER_VISION_SUBSCRIPTION_KEY;
const endpoint = process.env.MS_COMPUTER_VISION_ENDPOINT;
const faceEndpoint = process.env.MS_FACE_ENDPOINT;
const subscriptionKey = process.env.MS_FACE_SUB_KEY;

const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { "Ocp-Apim-Subscription-Key": key } }),
  endpoint
);

//Server Setup
app.set("view engine", "ejs");
app.use(express.static("public"));

//Routes
app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/", upload.single("file-to-upload"), async (req, res) => {
  try {
    // Upload image to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
    const facesImageURL = result.secure_url;

    /**
         * DETECT FACES
         * This example detects faces and returns its:
         *     gender, age, location of face (bounding box), confidence score, and size of face.
         */
     console.log('-------------------------------------------------');
     console.log('DETECT FACES');
     console.log();

     // <snippet_faces>
  //   const facesImageURL = 'https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/ComputerVision/Images/faces.jpg';

     // Analyze URL image.
     console.log('Analyzing faces in image...', facesImageURL.split('/').pop());
     // Get the visual feature for 'Faces' only.
     const faces = (await computerVisionClient.analyzeImage(facesImageURL, { visualFeatures: ['Faces'] })).faces;

     // Print the bounding box, gender, and age from the faces.
     if (faces.length) {
       
       console.log(`${faces.length} face${faces.length == 1 ? '' : 's'} found:`);
       for (const face of faces) {
         
         console.log(`    Gender: ${face.gender}`.padEnd(20)
           + ` Age: ${face.age}`.padEnd(10) + `at ${formatRectFaces(face.faceRectangle)}`);
       }
     } else { console.log('No faces found.'); }
     // </snippet_faces>

     // <snippet_formatfaces>
     // Formats the bounding box
     function formatRectFaces(rect) {
       return `top=${rect.top}`.padEnd(10) + `left=${rect.left}`.padEnd(10) + `bottom=${rect.top + rect.height}`.padEnd(12)
         + `right=${rect.left + rect.width}`.padEnd(10) + `(${rect.width}x${rect.height})`;
     }
     // </snippet_formatfaces>

     /**
      * END - Detect Faces
      */
  
    res.render("result.ejs", { faces: faces, img: facesImageURL });
  } catch (err) {
    res.redirect('/')
    console.log(err);
  }
});

app.listen(process.env.PORT || 8000);
