const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
const http = require("http");
const { Server } = require("socket.io");
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
dotenv.config();

app.get("/query", async (req, res) => {
  try {
    const client = new MongoClient(
      "mongodb+srv://ahmedkn2000:l9GOMRQEfB67rFHl@portfolio.n884d.mongodb.net/Fitness?retryWrites=true&w=majority",
      {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      }
    );
    try {
      // Connect the client to the server
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      res.send({ message: "database connected..." });
    } catch (err) {
      res.send({ message: "database refused connection..." });
    }
  } catch (err) {
    res.send({ message: "database refused connection..." });
  }
});


app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
let databases = [];
//socket call
function printSchema(obj, indent) {
  for (var key in obj) {
    if (typeof obj[key] !== "function") {
      console.log(indent + key + ": " + typeof obj[key]);
      if (typeof obj[key] === "object") {
        printSchema(obj[key], indent + "\t");
      }
    }
  }
}

io.on("connection", (socket) => {
  let user = { id: socket.id, client: null };
  !databases.some((el) => el.id === user.id) && databases.push(user);

  socket.on("connect-database", async (parameter) => {
    const existUser = databases.findIndex((el) => el.id === socket.id);
    if (existUser === -1) {
      console.log("user not found");
    } else {
      const client = await new MongoClient(parameter, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });
      databases[existUser].client = client;
      console.log("Database connected");
      socket.emit("db-connected","DB connected");
    }
  });

  socket.on("gpt-prompt", async (query) => {
    try{
        const existUser = databases.findIndex((el) => el.id === socket.id);
    let metadata = await databases[existUser].client
      .db()
      .admin()
      .listDatabases();

    metadata.databases.map(async (el) => {
      let res = await databases[existUser].client
        .db(el.name)
        .listCollections()
        .toArray();
      await res.map(async (col) => {
        const collectionDetails = await databases[existUser].client
          .db(el.name)
          .collection(col.name)
          .findOne();
        console.log(
          `--------------------------- COLLECTION ${col.name} SCHEMA ---------------------------`
        );
        // console.log(collectionDetails);
        printSchema(collectionDetails,"");
        // collectionDetails !== null
        //   ? console.log(Object.keys(collectionDetails))
        //   : null;
        console.log(
          "-----------------------------------------------------------------------------------"
        );
      });
    });
    }
    catch(err){
        console.log("oops ! error equired pls refresh the page");
    }
  });

  socket.on("disconnect", () => {
    databases = databases.filter((obj) => obj.id !== socket.id);
    console.log(`user with id: ${socket.id} disconnected`);
  });
});
// setInterval(()=>{console.log(databases);},1000)
server.listen(5000, (err) =>
  err
    ? console.log("server error")
    : console.log(`server is running on PORT ${5000}`)
);
