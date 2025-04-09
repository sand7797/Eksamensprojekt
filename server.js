const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');
const fs = require('fs')

const userTimes = []
const app = express();
const PORT = 3000;

const filePath = path.join(__dirname, 'pixels.json');

app.use(express.json());
app.use(express.static("public"));

const client = jwksClient({
  jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys', // Til offentlige microsoft keys 
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      callback(null, key.publicKey || key.rsaPublicKey);
    }
  });
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/canvas", (req, res) => {
    res.sendFile(filePath);
});

app.post("/verify-user", (req, res) => {
  const { token } = req.body;

  const decodedHeader = jwt.decode(token, { complete: true });

  if (!decodedHeader) {
      return res.status(401).json({ error: "Ikke logget ind"});
  }

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Ikke logget ind"});
    }

    const userObj = userTimes.find(obj => obj.user.includes(decoded.preferred_username));
    if (userObj) {
	return res.status(200).send([decoded, userObj.time])
    } else {
	console.log("Brugernøgle er lowkey cap");
    }
    return res.status(200).send(decoded);
      
    console.log(decoded.preferred_username)
  });
});

app.post("/pixel", (req, res) => {
    //Besked
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Besked påkrævet" });
    }
    
    console.log("Received message:", message);
    //Verify
    //Hvis intet token er sendt
    if(!message?.token) {
	return res.status(401).json({ error: "Ikke logget ind"});
    }
    let token = message.token;
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      //Hvis token er ugyldigt
      if (err) {
	console.log("wrong token")
	return res.status(401).json({ error: "Ikke logget ind"});
      }
      console.log(decoded);
      
      //Hvis next mail
      if(decoded?.preferred_username.endsWith("@edu.nextkbh.dk")) {
	console.log("true")
	console.log(decoded.preferred_username)
	
	const userData = {user: decoded.preferred_username, time: Date.now()}
	//Hvis brugeren findes i arrayet opdater, ellers push
	const index = userTimes.findIndex(userobj => userobj.user === userData.user)
	if (index !== -1) {
	  console.log("bruger findes")
	  const ventetid = 5 * 60 * 1000
	  //Hvis mindre end 5 m siden
	  if (Date.now() - userTimes[index].time < ventetid) {
	    return res.status(401).json({error: "Du skal vente 5 min mellem hver pixel"});
	  }
	  userTimes[index].time = Date.now()
	} else {
	  console.log("bruger findes ikke")
	  userTimes.push(userData)
	}
	console.log(userTimes)
	

	let currentObj = message.currentObj

	fs.readFile(filePath, 'utf8', (err, data) => {
	  if (err) {
	    return;
	  }

	  let jsonData = JSON.parse(data);

	  for (let i = 0; i < jsonData.length; i++) {
	    if (jsonData[i].x === currentObj.x && jsonData[i].y === currentObj.y) {
	      jsonData[i].c = currentObj.c;
	      break;
	    }
	  }
	  fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
	    return res.status(200).json({message: "succes"})
	    if (err) {
	      console.error("Fil blev ikke opdateret", err);
	    }
	  });
	});
	//Hvis ikke en next konto blev regristreret
      } else {
	return res.status(403).json({error: "Ikke logget ind"})
      }

    });
  });

app.listen(PORT, () => {
  console.log(`Server kører http://localhost:${PORT}`);
});
