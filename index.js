const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(`${process.env.PAYMENT_SECRET_KEY}`)
const port = process.env.PORT || 5000;


// middleware 
app.use(cors());
app.use(express.json());

// jwt middleware
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "Unauthorized access" })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: "unauthorized access" })
        }
        req.decoded = decoded;
        next();
    })

}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zexvqii.mongodb.net/?retryWrites=true&w=majority`;

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
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const userCollection = client.db('globalTongues').collection('users');
        const classCollection = client.db('globalTongues').collection('classes');
        const studentClassCollection = client.db('globalTongues').collection('studentClass');
        const paymentCollection = client.db('globalTongues').collection('payment');
        const cartCollection = client.db('globalTongues').collection('cart');

        // jwt token apis
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        // users apis -----------------------------------------------

        app.get('/users',verifyJWT, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const userExit = await userCollection.findOne(query);
            if (userExit) {
                return res.send({ message: "user already exits" })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        // student related apis-------------------------------

        app.get('/users/student/:email', async (req, res) => {
            const email = req.params.email;
            // if (req.decoded.email !== email) {
            //     return { student: false }
            // }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { student: user?.role === 'student' }
            res.send(result);
        })


        // admin related apis-------------------------------

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            // if (req.decoded.email !== email) {
            //     return { admin: false }
            // }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        // make admin 
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);

        });

        // instructor related apis---------------------------
        // make instructor 
        app.get('/users/instructor/:email', async (req, res) => {
            const email = req.params.email;
            // if (req.decoded.email !== email) {
            //     return { instructor: false }
            // }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        })
        app.get('/users/instructor', async (req, res) => {
            const query = { role: 'instructor' }
            const result = await userCollection.find(query).toArray();
            res.send(result);
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);

        });
        
        app.get('/instructor/myClasses/:email', async (req, res) => {
            const email = req.params.email;
            const query = { instructorEmail: email };
            const result = await classCollection.find(query).toArray();
            res.send(result);
        })


        // classes apis-------------------------------
        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })
        app.get('/class/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.findOne(query);
            res.send(result);
        })
        app.post('/classes', async (req, res) => {
            const newClass = req.body;
            const result = await classCollection.insertOne(newClass);
            res.send(result);
        })
        app.patch('/updateClass/:id', async (req, res) => {
            const id = req.params.id;
            const course = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    availableSeats: course.availableSeats,
                    price: course.price,
                    image: course.image
                }
            }
            const result = await classCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.patch('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const feedback = req.body;
            const options = { upsert: true };
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    feedback
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.patch('/classes/approve/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'approve'
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc)
            res.send(result);
        })

        app.get('/classes/approve', async (req, res) => {
            const query = { status: 'approve' }
            const result = await classCollection.find(query).sort({ totalEnrolled: 1 }).toArray();
            res.send(result)
        })

        // make deny classes
        app.patch('/classes/deny/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'deny'
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc)
            res.send(result);
        })

        app.get('/classes/deny', async (req, res) => {
            const query = { status: 'deny' }
            const result = await classCollection.find(query).toArray();
            res.send(result)
        })

        // student class apis------------------------------

        app.post('/student/myClasses', async (req, res) => {
            const course = req.body;
            const result = await studentClassCollection.insertOne(course);
            res.send(result);
        })
        app.get('/student/myClasses/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await studentClassCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/student/class/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await studentClassCollection.findOne(query);
            res.send(result);
        })

        app.patch('/student/myClasses/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'Enrolled'
                },
            };
            const result = await studentClassCollection.updateOne(filter, updateDoc)
            res.send(result);
        })
        app.delete('/student/myClasses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await studentClassCollection.deleteOne(query);
            res.send(result);
        })

        // student enrolled class----------------
        app.get('/student/enrolled/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
            res.send(result);
        })

        // payment related  apis----------------------------------------

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);
            const oldCourseId = payment.oldCourseId;
            const query = { _id: new ObjectId(payment.courseId) }
            const classId = new ObjectId(oldCourseId);

            const updateResult = await classCollection.findOneAndUpdate(
                { _id: classId },
                { $inc: { availableSeats: -1, totalEnrolled: 1 } },
                { returnOriginal: false }
            )

            const deleteResult = await cartCollection.deleteMany(query);

            res.send({ result: insertResult, deleteResult, updateClass: updateResult });

        })
        // payment intent api ---
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })



        // Send a ping to confirm a successful connection----------------------------database-------------
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Global Tongues server is running")
})

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
})