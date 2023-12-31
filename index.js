const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.SecretKey_Payment)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());







const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g5cwrlz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {


        const usersCollection = client.db("lingoz").collection("users");
        const classesCollection = client.db("lingoz").collection("classes");
        const cartsCollection = client.db("lingoz").collection("carts");



        // Get All user
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        // Users insert to db
        app.post('/users', async (req, res) => {
            const user = req.body;

            // For google - if user already exist
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already exists" })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // Make user Admin
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // Make user Instructor
        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        // Get user role
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);

            if (!result) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            console.log(result);
            res.send(result);
        })


        // app.get('/users/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const query = { email: email };
        //     const result = await usersCollection.findOne(query);

        //     if (!result) {
        //         res.status(404).json({ error: 'User not found' });
        //         return;
        //     }

        //     res.json(result);
        // });



        // Get all Instructors
        app.get('/instructors', async (req, res) => {
            const query = { role: "instructor" };
            const cursor = usersCollection.find(query);
            const instructors = await cursor.toArray();
            res.send(instructors);
        });

        // Get all Classes
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        });


        // Get all Approved classes
        app.get('/classes/status/approved', async (req, res) => {
            const query = { status: "approved" };
            const cursor = classesCollection.find(query).sort({ availableSeat: 1 });
            const result = await cursor.toArray();
            res.send(result);
        });

        // Get cart items
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const query = { email: email };
            const result = await cartsCollection.find(query).toArray();
            res.send(result);
        });


        // add classes to db
        app.post('/classes', async (req, res) => {
            const classes = req.body;
            const result = await classesCollection.insertOne(classes);
            res.send(result);
            // console.log(classes);
            // const query = { role: "instructor" };
            // const cursor = usersCollection.find(query);
            // const instructors = await cursor.toArray();
            // res.send(instructors);
        });


        // Students Cart Collection
        app.post('/carts', async (req, res) => {
            const classes = req.body;
            console.log(classes);
            const result = await cartsCollection.insertOne(classes);
            res.send(result);

        });







        // Update status Classes
        app.patch('/classes/status/approved/:id', async (req, res) => {
            const id = req.params.id;
            // const status = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'approved',
                },
            };
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // Deny status Classes
        app.patch('/classes/status/denied/:id', async (req, res) => {
            const id = req.params.id;
            // const status = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'denied',
                },
            };
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // pending status Classes
        app.patch('/classes/status/pending/:id', async (req, res) => {
            const id = req.params.id;
            // const status = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'pending',
                },
            };
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        // Cllaa status feedback
        app.patch('/classes/status/feedback/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body;
            console.log(status);
            // const filter = { _id: new ObjectId(id) };
            // const updateDoc = {
            //     $set: {
            //         status: status,
            //     },
            // };
            // const result = await classesCollection.updateOne(filter, updateDoc);
            // res.send(result);
        });



        // Delete cart items
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartsCollection.deleteOne(query);
            res.send(result);
        });



        // Payment
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });








        // Connect the client to the server	(optional starting in v4.7)
        client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get('/', (req, res) => {
    res.send("Lingoz is running");
});

app.listen(port, () => {
    console.log(`Lingoz Running on port ${port}`);
});