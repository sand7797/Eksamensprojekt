let pixels = [];
let currentObj;
let pixelsize;

function setup() 
{
  createCanvas(windowWidth, windowHeight);

  for(i=0;i<125;i++) {
    for(j=0;j<75;j++) {
      pixels.push({x:i,y:j,c:0})
    }
  }
  console.log(pixels);
  pixelsize = windowHeight/80;
  
  let button = createButton('log ind');
  button.mousePressed(login);
}

function windowResized() {
  pixelsize = windowHeight/80;
}

function draw() {
  push();
  text('countdown', (125*pixelsize+windowWidth)/2, 20)
  fill(50)
  rect(125*pixelsize,0,windowWidth,75*pixelsize)
  pop();


  pixels.forEach(obj => {
    let x = pixelsize*obj.x
    let y = pixelsize*obj.y
    push();
    noStroke();
    square(x, y, pixelsize);
    pop();

    if (mouseX >= x && mouseX < x+pixelsize && mouseY >= y && mouseY < y+pixelsize) {
      currentObj = obj;

      if (mouseIsPressed === true) {
	console.log(currentObj);
      }
    }
  });

  if (currentObj) {
    square(pixelsize*currentObj.x, pixelsize*currentObj.y, pixelsize);
  }

}


const msalConfig = {
  auth: {
    clientId: 'a7e03e41-02e3-460d-bb77-4334c3adced4',  // Replace with your actual client ID
    authority: 'https://login.microsoftonline.com/common',  // common authority
    redirectUri: window.location.href,  // Redirect URI (can be localhost during development)
  },
  cache: {
    cacheLocation: 'sessionStorage',  // Store session in sessionStorage
    storeAuthStateInCookie: true,     // For IE 11 compatibility
  },
};

const msalInstance = new msal.PublicClientApplication(msalConfig);


function login() {
  msalInstance.loginPopup({ scopes: ["User.Read"] })
    .then(response => {
      console.log("Logged in", response);
      // You can now call the Microsoft Graph API with the access token
      getOrganizationDetails(response.accessToken);
    })
    .catch(error => {
      console.error(error);
    });
}
