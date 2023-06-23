const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.Payment_Secrect_Key);
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//Start JWT verification
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];
  console.log("Token inside verify JWT", token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(403)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};
//End JWT verification

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.vhpjabi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //Define database collection

    const classCollection = client.db("summerCampSchool").collection("classes");
    const pendingClassCollection = client.db("summerCampSchool").collection("pendingClasses");
 
    const userCollection = client.db("summerCampSchool").collection("users");
    const cartCollection = client.db("summerCampSchool").collection("carts");
    const paymentCollection = client
      .db("summerCampSchool")
      .collection("payments");

    //Start JWT operation
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });
    //End JWT operation

    // Warning: use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    
    // Warning: use verifyJWT before using verifyInstructor
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    
    // Server visual test
    app.get("/", (req, res) => {
      res.send("Server start!!!");
    });


    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //user collection apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // check admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    //admin update by specific id
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // check instructor
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    //User data update api
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

   
    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      // Check if the user has the necessary authorization
      if (req.user.role !== "admin") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send({ deletedCount: result.deletedCount });
    });

    // User api finish here


    

    // Classes or Data display apis
    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

  


    app.get("/classes", verifyJWT, async (req, res) => {
      const email = req.query.email;
  
      if (!email) {
          res.send([]);
          // return res.redirect("/");
      }
  
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
          return res.status(403).send({ error: true, message: "Forbidden access" });
      }
  
      const query = { email: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
  });
  
  //Enroll student apis
  // app.post("/enroll", verifyJWT, async (req, res) => {
  //     const email = req.body.email;
  //     const classId = req.body.classId;
  
  //     if (!email || !classId) {
  //         return res.status(400).send({ error: true, message: "Invalid request parameters" });
  //     }
  
  //     const decodedEmail = req.decoded.email;
  //     if (email !== decodedEmail) {
  //         return res.status(403).send({ error: true, message: "Forbidden access" });
  //     }
  
  //     // Find the class by ID
  //     const classData = await classCollection.findOne({ _id: ObjectId(classId) });
  
  //     if (!classData) {
  //         return res.status(404).send({ error: true, message: "Class not found" });
  //     }
  
  //     if (classData.availableSeats === 0) {
  //         return res.status(400).send({ error: true, message: "No available seats" });
  //     }
  
  //     // Decrease the available seat count and update the class in the database
  //     const updatedClass = await classCollection.findOneAndUpdate(
  //         { _id: ObjectId(classId) },
  //         { $inc: { availableSeats: -1 } },
  //         { returnOriginal: false }
  //     );
  
  //     res.send(updatedClass.value);
  // });

  

     //Specific data in Database(MongoDB) update api
     app.patch("/classes/:id", async (req, res) => {
      try {
        const specificItemId = req.params.id; //catch the target item
        const updatedCarData = req.body; //get data from website to server site
        const filter = { _id: new ObjectId(specificItemId) }; //Match the target item database and client site
        // const options = { upsert: true }; // If data is not
        // const newUpdatedItem = {
        //   $set: {
        //     ...updatedCarData,
        //   },
        // };
        const newUpdatedItem = {
          $set: {
            status: updatedCarData.status,
          },
        };
        const result = await classCollection.updateOne(
          filter,
          newUpdatedItem
        );
        res.send(result);
      } catch (error) {
        res.send(error.message);
      }
    });

    // Data update feedback api
    app.post("/classes/send-feedback", async (req, res) => {
      try {
        const { id, feedback } = req.body;
        const filter = { _id: new ObjectId(id) };
        const update = { $set: { feedback } };
    
        const result = await classCollection.updateOne(filter, update);
        res.send(result);
      } catch (error) {
        res.send(error.message);
      }
    });

    // Class item add
    app.post("/classes", verifyJWT, verifyInstructor, async (req, res) => {
      const newClass = req.body;
      newClass.status = 'pending';
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    // Class approve by admin
    app.put('/classes/:id/approve',verifyJWT,verifyAdmin ,async(req, res)=>{
      const classId = req.params.id;
      const filter ={
        _id: classId ,
        $set: { status: 'approved' },
        
      }

      const result = await classCollection.findOneAndUpdate(filter);
      res.send(result);
    });
    

    // Class item delete
    app.delete("/classes/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(query);
      res.send(result);
    });

 
    // cart or buy or enrolled collection api
    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    // cart collection
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    // cart item delete
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    //Get payment api
    app.get("/payment", verifyJWT, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }

      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    //Payment card api

    // create payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Payment related api
    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
      const query = {
        _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
      };
      const deleteResult = await cartCollection.deleteMany(query);
      res.send({ insertResult, deleteResult });
    });

 


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`My server on port ${port}`);
});


