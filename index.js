const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId, } = require('mongodb');
const res = require('express/lib/response');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

app.use(cors());
app.use(express.json());



function verifyToken(req, res, next) {
    console.log("something")
    const header = req.headers.authorization;
    if (!header) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = header.split(' ')[1];
    console.log(token);
    jwt.verify(token, process.env.SECRET_ALGO, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(403).send({ message: 'Forbidden' });
        }

        console.log(decoded)
        req.decoded = decoded;
    })
    next()
}



const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.nagee.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const partCollection = client.db("SpaceShip").collection("Parts");
const orderCollection = client.db("SpaceShip").collection("orders");
const reviewCollection = client.db("SpaceShip").collection("reviews");
const profileCollection = client.db("SpaceShip").collection("profile");
const paymentCollection = client.db("SpaceShip").collection("payments");

const verifyAdmin = async (req, res, next) => {
    const requester = req.decoded?.email;
    console.log(requester)
    const initatorAccount = await profileCollection.find({ email: requester });
    if (initatorAccount.role === "admin") {
        next();
    }
    else {
        return res.status(403).send("Forbidden access");
    }

}




async function run() {
    try {
        await client.connect();



        // Getting all parts
        app.get('/parts', async (req, res) => {
            const query = {}
            const result = await partCollection.find(query).toArray()
            res.send(result);
        });



        //geting single part for purchase page
        app.get('/parts/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partCollection.findOne(query)
            res.send(result)
        });


        //Posting an order
        app.post('/orders', verifyToken, async (req, res) => {

            const orders = req.body;

            const query = { email: orders.email, address: orders.address, name: orders.name }
            const exists = await orderCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await orderCollection.insertOne(orders);
            return res.send({ success: true, result });
        });

        //Geting users Orders
        app.get('/myOrders/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        });


        //detleting the orders. need to update later
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });


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
        });


        //get all review for home 
        app.get('/review', async (req, res) => {
            const query = {};
            const result = await reviewCollection.find(query).toArray();
            res.send(result);
        });


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
        });


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
            res.send({ success: true, result });
        });


        // Implementing web token when user does authentication
        app.post('/login', async (req, res) => {
            const user = req.body.email;
            console.log("user", user);
            const accessToken = jwt.sign(user, process.env.SECRET_ALGO, {

            })
            res.send({ accessToken })
        });


        //Get all prifile data for admin page
        app.get('/admin', async (req, res) => {
            const query = {};
            const result = await profileCollection.find(query).toArray();
            res.send(result);
        });


        //make admin
        app.put('/admin/:email', verifyAdmin, verifyToken, async (req, res) => {
            const email = req.params;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: "admin" }
            }
            const result = await profileCollection.updateOne(filter, updateDoc);
            return res.send({ result });
        });



        //getting Geting admin
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await profileCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        //adding a product by admin
        app.post('/addProduct', async (req, res) => {
            const produtDetails = req.body;
            const query = { price: produtDetails.price, picture: produtDetails.picture, name: produtDetails.name, }

            const exists = await partCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await partCollection.insertOne(produtDetails);
            return res.send({ success: true, result });
        })

        app.get("/manageProducts", async (req, res) => {
            const query = {};
            const result = await partCollection.find(query).toArray();
            res.send(result);
        });

        //deleteng products from manage product page
        app.delete('/manageProdutc/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partCollection.deleteOne(query);
            res.send(result);
        });

        //Geting a order for payment.
        app.get("/payment/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })

        // Calculating payment 
        app.post('/create-payment-intent', async (req, res) => {
            const service = req.body;
            console.log(service);
            const price = service?.priceNum;
            const amount = price * 100;
            console.log(amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const payment = req.body;
            console.log(payment);
            const filter = { _id: ObjectId(id) };
            const UpdatedDoc = {
                $set: {
                    paid: true,
                    transjactionId: payment.transactionId
                }
            }
            //   const result = await paymentCollection.insertOne(UpdatedDoc);
            const updatedOrders = await orderCollection.updateOne(filter, UpdatedDoc)
            res.send(UpdatedDoc);
        })

        //getting all orders.
        app.get('/orders', async (req, res) => {
            const query = {};
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        })

        //gring a single item for deleting
        app.delete('/unpaidOrder/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await orderCollection.deleteOne(query);
            res.send(result)
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