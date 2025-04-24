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

//Hvis pixel request er modtaget
app.post("/pixel", (req, res) => {
    //Requestens body gemmes under objektet message
    const { message } = req.body;
    //Hvis message ikke er sendt, sendes en fejlkode
    if (!message) {
        return res.status(400).json({ error: "Besked påkrævet" });
    }
    //Hvis ikke, logges revieved message
    console.log("Received message:", message);
    //Hvis message ikke indeholder et login token, så send en fejlkode
    if(!message?.token) {
	return res.status(401).json({ error: "Ikke logget ind"});
    }
    //Gem token
    let token = message.token;
    //Brugt jwt library til at godkendte tokenen, dette returnerer enten en decoded token eller en error
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
	//Hvis en error er returneret, logges det og en fejlkode sendes
	console.log("wrong token")
	return res.status(401).json({ error: "Ikke logget ind"});
      }
      //Decoded token logges
      console.log(decoded);
      
      //Hvis "prefered_username" slutter med @edu.nextkbh.dk
      if(decoded?.preferred_username.endsWith("@edu.nextkbh.dk")) {
	console.log("true")
	console.log(decoded.preferred_username)
	//log dette 
	
	const userData = {user: decoded.preferred_username, time: Date.now()}
	//Email og tiden gemmes som userData 
	const index = userTimes.findIndex(userobj => userobj.user === userData.user)
	//Find indexet af brugeren i userTimes arrayet
	if (index !== -1) {
	  //Hvis index ikke er -1, (dvs at brugeren i forvejen findes)
	  console.log("bruger findes")
	  const ventetid = 5 * 60 * 1000
	  //5 min
	  if (Date.now() - userTimes[index].time < ventetid) {
	    //Hvis nuværende tidspunkt - sidste placering er lavere end ventetiden. (Cooldown ikke godkendt)
	    return res.status(401).json({error: "Du skal vente 5 min mellem hver pixel"});
	    //Send fejlkode
	  }
	  //Tiden for brugeren gemmes i userTies
	  userTimes[index].time = Date.now()
	} else {
	  //Hvis brugeren ikke har placeret før, pushes dette som nyt element af userTimes
	  console.log("bruger findes ikke")
	  userTimes.push(userData)
	}
	console.log(userTimes)
	

	let currentObj = message.currentObj
	//Curentobj erklæres og tildeles, dette indeholder pixel informationen

	fs.readFile(filePath, 'utf8', (err, data) => {
	  //Readfile bruges til at læse indeholdet af lærredet (filePath tildelt i starten af koden)
	  if (err) {
	    return;
	  }
	  //Hvis ikke fundet (meget usandsynligt) returnes bare

	  let jsonData = JSON.parse(data);
	  //jsonData erklæres, og tildeles som parsed data fra lærredfilen

	  for (let i = 0; i < jsonData.length; i++) {
	    //Iteres for hvert objekt i filen
	    if (jsonData[i].x === currentObj.x && jsonData[i].y === currentObj.y) {
	      //Hvis x, og y coordinaten matcher
	      jsonData[i].c = currentObj.c;
	      //Farveværdien sættes til den fra currentobjekt
	      break;
	      //Break, da endu flere iterationer ikke længere er nødvendigt (sparer lidt processing power)
	    }
	  }
	  fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
	    //Den nye jsonData skrives så til filen
	    return res.status(200).json({message: "succes"})
	    if (err) {
	      console.error("Fil blev ikke opdateret", err);
	    }
	    //Fejlkode sendes hvis mislykkedes
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
