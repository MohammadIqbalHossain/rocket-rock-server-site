const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const { MongoClient, ServerApiVersion, ObjectId, } = require('mongodb');
const res = require('express/lib/response');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.nagee.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const partCollection = client.db("SpaceShip").collection("Parts");
const orderCollection = client.db("SpaceShip").collection("orders");
const reviewCollection = client.db("SpaceShip").collection("reviews");
const profileCollection = client.db("SpaceShip").collection("profile");


async function run() {
    try {
        await client.connect();

        //Getting all parts
        app.get('/parts', async (req, res) => {
            const query = {}
            const result = await partCollection.find(query).toArray()
            res.send(result);
        });

        //geting single part for purchase page
        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partCollection.findOne(query)
            res.send(result)
        })


        //Posting an order
        app.post('/orders', async (req, res) => {
            const orders = req.body;
            const query = { email: orders.email, address: orders.address, name: orders.name }
            const exists = await orderCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await orderCollection.insertOne(orders);
            return res.send({ success: true, result });
        })

        //Geting users Orders
        app.get('/myOrders', async (req, res) => {
            const query = {};
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        });

        //detleting the orders. need to update later
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

        //Add a Review
        app.post("/review", async (req, res) => {
            const review = req.body;
            const query = { review: review.review, ratings: review.ratings, email: review.email }
            const exists = await reviewCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await reviewCollection.insertOne(review);
            return res.send({ success: true, result });
        })

        //get all review for home 
        app.get('/review', async (req, res) => {
            const query = {};
            const result = await reviewCollection.find(query).toArray();
            res.send(result);
        })

        //posting profile
        app.post('/profile', async (req, res) => {
            const profile = req.body;

            const query = { email: profile.review, phone: profile.phone, firstname: profile.firstname }
            const exists = await profileCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await profileCollection.insertOne(profile);
            return res.send({ success: true, result });
        })

        //updating users profile
        app.put('/update/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const profile = req.body;
            const options = { upsert: true };
            const updateDoc = {
                $set: profile,
            };
            const result = await profileCollection.updateOne(filter, updateDoc, options);
            res.send({success: true, result});
        })




    }
    finally {

    }
}

run().catch(console.dir);




app.get("/", (req, res) => {
    res.send("Running The server");
})


app.listen(port, () => {
    console.log("listening from the port", port);
})