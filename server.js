const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
const http = require("http");
const fs = require("fs");
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
function printSchemaToFile(obj, indent, filePath, name) {
  const stream = fs.createWriteStream(filePath, { flags: "a" });
  function writeToFile(data) {
    stream.write(data + "\n");
  }
  writeToFile(
    `--------------------------- COLLECTION ${name} SCHEMA ---------------------------`
  );
  function traverseObject(obj, currentIndent) {
    for (const key in obj) {
      if (typeof obj[key] !== "function") {
        const line = currentIndent + key + ": " + typeof obj[key];
        writeToFile(line);
        if (typeof obj[key] === "object") {
          traverseObject(obj[key], currentIndent + "\t");
        }
      }
    }
  }

  traverseObject(obj, indent);
  writeToFile(
    "-----------------------------------------------------------------------------------"
  );
  stream.end();
}

io.on("connection", (socket) => {
  let user = { id: socket.id, client: null };
  !databases.some((el) => el.id === user.id) && databases.push(user);

  socket.on("connect-database", async (parameter) => {
    const existUser = databases.findIndex((el) => el.id === socket.id);
    try {
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
        if (client) socket.emit("db-connected", "DB connected...");
      }
    } catch (err) {
      console.log(err);
      socket.emit("db-connected", "Error connecting to DB...");
    }
  });

  socket.on("gpt-prompt", async (query) => {
    try {
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
          const outputFilePath = "schema_output.txt";
          printSchemaToFile(collectionDetails, "", outputFilePath, col.name);
        });
      });
    } catch (err) {
      console.log("oops ! error equired pls refresh the page");
    }
  });

  socket.on("disconnect", () => {
    databases = databases.filter((obj) => obj.id !== socket.id);
    console.log(`user with id: ${socket.id} disconnected`);
  });
});
server.listen(5000, (err) =>
  err
    ? console.log("server error")
    : console.log(`server is running on PORT ${5000}`)
);
