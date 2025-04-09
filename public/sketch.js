let pixels = [];
let currentObj;
let pixelsize;
let colours;
let chosenColour = 0;
let loggedIn = false
let textString = ""
let lastPlaceTime;
let endTime;

function preload() {
  loginImg = loadImage('/assets/mslogin.png')
  logoutImg = loadImage('/assets/mslogout.png')
}

function setup() {
  //Checktime

  checkKonto()
  fetchCanvas()

  colours = [color('#FFFFFF'),color('#E4E4E4'),color('#888888'),color('#222222'),
color('#FFA7D1'),color('#E50000'),color('#E59500'),color('#A06A42'),
color('#E5D900'),color('#94E044'),color('#02BE01'),color('#00D3DD'),
color('#0083C7'),color('#0000EA'),color('#CF6EE4'),color('#820080')]

  createCanvas(windowWidth, windowHeight);

  for(i=0;i<125;i++) {
    for(j=0;j<75;j++) {
      pixels.push({x:i,y:j,c:0})
    }
  }
  pixelsize = windowHeight/90;
}


function windowResized() {
  pixelsize = windowHeight/80;
}

function draw() {
  clear();
  cursor(ARROW);

  push()
  noStroke();
  fill(255)
  rect(0,0,pixelsize*125,pixelsize*75)
  pop()

  let c = 0;
  for (i=0; i<2; i++) {
    for (j=0; j<8; j++) {
      let x = 125*pixelsize+35+65*i;
      let y = 200+60*j;
      fill(colours[c])
      
      if (chosenColour === c) {
	square(x-5, y-5, 60)
      } else {
	square(x, y, 50)
      }

      if (mouseX >= x && mouseX < x+50 && mouseY >= y && mouseY < y+50) {
	cursor(HAND);
	if (mouseIsPressed === true) {
	  chosenColour = c;
	}
      }
      c++;
    }
  }
    //Timer
    if (loggedIn === true) {
      if (endTime < Date.now()) {
	textString = "Du kan placere!"
      } else {
	const resterende = endTime - Date.now();	
	const mins = Math.floor(resterende / 60000) //floor nedrunder
	const secs = Math.floor((resterende % 60000) / 1000); //% for at fjerne minutter, beholder kun ms der ikke fik fuldt minut
	const secsFormateret = String(secs).padStart(2, "0") //Så der altid er 2 tal
	textString = `${mins}:${secsFormateret}`;
      }
    } else {
      textString = "Log ind først"
    }
    push()
    textAlign(CENTER, CENTER);  
    textSize(16);
    fill(255)
    text(textString, 125*pixelsize+90, 70)
    pop()

    push();
    pixels.forEach(obj => {

    let x = pixelsize*obj.x
    let y = pixelsize*obj.y
    push();
    noStroke();
    fill(colours[obj.c])
    square(x, y, pixelsize);
    pop();

    if (mouseX >= x && mouseX < x+pixelsize && mouseY >= y && mouseY < y+pixelsize) {
      currentObj = obj;

      if (mouseIsPressed === true) {
	currentObj.c = chosenColour;
	let token = msalInstance.getAccount()?.idToken
	  sendPixel({currentObj,token:token})
	  console.log(loggedIn)
      }
    }
  });

  if (currentObj) {
    push()
    fill(colours[chosenColour]);
    square(pixelsize*currentObj.x, pixelsize*currentObj.y, pixelsize);
    pop()
  }

  let x = 125*pixelsize+10;
  let y = 10;
  let scale = 175;
  let scaleFactor = scale/(896/171);
  if (loggedIn === true) {
    ButnImg = logoutImg
  } else {
    ButnImg = loginImg
  }
  image(ButnImg, x, y, scale, scaleFactor);
  if (mouseX >= x && mouseX < x + scale && mouseY >= y && mouseY < y+scaleFactor) {
    cursor(HAND);
    if (mouseIsPressed === true) {
      if (loggedIn === true) {
	msalInstance.logout()
      } else {
	login();
      }
    }
  }
}

const msalConfig = {
  auth: {
    clientId: 'a7e03e41-02e3-460d-bb77-4334c3adced4', 
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: 'http://localhost:3000',
  },
  cache: {
    cacheLocation: 'localStorage',  //Måske ændre det til local senere
    storeAuthStateInCookie: false, //True senere
  },
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

function login() {
  msalInstance.loginPopup({ scopes: ["User.Read"] }).then(response => {
    console.log("ID Token:", response);

    loggedIn = true
  }).catch(error => {
    console.error("Login failed:", error);
  });
}

function fetchCanvas() {
  fetch("http://localhost:3000/canvas")
    .then(response => response.json())
    .then(data => {
      pixels = data;
    })
    .catch(error => console.error("Error:", error));
}
setInterval(fetchCanvas, 2000);

function sendPixel(message) {
  fetch("http://localhost:3000/pixel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  })
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    if(data?.error == "Ikke logget ind") {
      alert("Du er ikke logget på med en NEXT-Konto, og kan derfor ikke bidrage, log ind med knappen i hjørnet")
    } else if (data?.error == "Du skal vente 5 min mellem hver pixel") {
      alert("Du skal vente 5 minutter mellem placerings af enhver pixel")
    } else if (data?.message == "succes") {
      lastPlaceTime = Date.now();
      endTime = Date.now() + 5 * 60 * 1000;
    }

  })
  .catch((error) => {
    console.error("Error sending pixel:", error);
  });
}

function checkKonto() {
  fetch("http://localhost:3000/verify-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: msalInstance.getAccount()?.idToken})
  })
  .then((response) => response.json())
  .then((data) => {
    console.log(data) 
    if(data?.error == "Ikke logget ind") {
      //Ikke logget ind
    } else {
      loggedIn = true;
    }
    if (Array.isArray(data) && data.length > 1) { //Hvis brugeren har time på serveren
      lastPlaceTime = data[1];
      endTime = lastPlaceTime + 5 * 60 * 1000;
    }
  })
}
