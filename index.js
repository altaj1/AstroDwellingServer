const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const port = process.env.PORT || 9000
const app = express()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
// console.log(stripe)
const corsOptions = {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://astro-dwelling.web.app',
      'https://astro-dwelling.firebaseapp.com/'
      
    ],
    credentials: true,
    optionSuccessStatus: 200,
  }
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  };
  app.use(cors(corsOptions))
  app.use(express.json())
  app.use(cookieParser())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zumttn0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyToken = (req, res, next) =>{
  const token = req?.cookies?.token;
  // console.log('token in the middleware', token);
  // no token available 
  if(!token){
      return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
      if(err){
          return res.status(401).send({message: 'unauthorized access'})
      }
      req.user = decoded;
      next();
  })
}

async function run() {
  try {

    const homeService = client.db('HomeServiceDB').collection('service')
     // jwt generate
     app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, cookieOptions)
        .send({ success: true })
    })

     // Save a services data in db
     app.post('/services', async (req, res) => {
      const jobData = req.body
      const result = await homeService.insertOne(jobData)
      res.send(result)
      
    })
    // clere cookis
    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', {...cookieOptions,  maxAge: 0 }).send({ success: true })
  })
  // create-payment-intent
  app.post('/create-payment-intent', verifyToken, async (req, res)=>{
    const price = req.body.price
    console.log(price)
    const priceInCent = parseFloat(price) * 100
     if (!price || priceInCent < 1) return
     const { client_secret } = await stripe.paymentIntents.create({
      amount: priceInCent,
      currency: 'usd',
      // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
      automatic_payment_methods: {
        enabled: true,
      },
    });
     // send client secret as response
     res.send({ clientSecret: client_secret })
  })

  app.get('/popular-services', async (req, res)=>{
    const result = await homeService.find().limit(6).toArray()
   
    res.send(result)

  })
// services to do
  app.get('/services-to-do',verifyToken, async(req, res)=>{
    let query ={}
    
    if(req.query.email){
      query = {
        "provider.email": req.query.email,
          booked:'true'
      }
    }
    
    const result = await homeService.find(query).toArray();
    res.send(result);
    
  })


  app.get('/all-services', async (req, res) =>{
    const search = req.query.search;
    let query = {
      serviceName: { $regex: search, $options: 'i' },
    };
    const result = await homeService.find(query).toArray()
    
     res.send(result)
  })
  app.get('/view-detail/:id', async(req, res)=>{
    
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await homeService.findOne(query)
    
    res.send(result)

  })
  app.get('/manag-services',  verifyToken, async (req, res) => {
    // console.log(req.query.email);
    // console.log('token owner info', req.user)
    if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'forbidden access'})
    }
    let query = {};
    if (req.query?.email) {
        query = { "provider.email": req.query.email }
    }
    
    const result = await homeService.find(query).toArray();
    res.send(result);
})
// booked services
  app.get('/bookings',  verifyToken, async (req, res) => {
    // console.log(req.query.email);
    // console.log('token owner info', req.user)
    if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'forbidden access'})
    }
    let query = {};
    if (req.query?.email) {
        query = { "buyer.userEmail": req.query.email }
    }
    
    const result = await homeService.find(query).toArray();
    res.send(result);
})


app.delete('/services-delete/:id',  async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const result = await homeService.deleteOne(query)
  res.send(result)
  console.log(result)
})

  
  app.put('/booking/:id', verifyToken, async(req, res)=>{
    const id = req.params.id
    // console.log(id)
      const bookingData = req.body
      // console.log(status.status)
      const query = { _id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          status: bookingData.status,
          bookingInfo: bookingData
        },
        
      }
      // const options = {upsert:true};
      const result = await homeService.updateOne(query, updateDoc)
      res.send(result)
      console.log(result)
  } )



  // update status
  app.patch('/updateStatus',  async(req, res)=>{
    const id = req.query.servicesID
    console.log(id)
    // .query.servicesStatus
      const value = req.query.servicesStatus
      const query = { _id: new ObjectId(id)}
     
      console.log(value)
      const updateDoc = {
        $set: {status: value},
        
      }
      const options = {upsert:true};
      const result = await homeService.updateOne(query, updateDoc, options)
      res.send(result)
      console.log(result)
  } )

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);




  app.get('/', (req, res) => {
    res.send('Hello astro dwelling server....')
  })
  
  app.listen(port, () => console.log(`Server running on port ${port}`))