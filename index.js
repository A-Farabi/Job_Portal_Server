require('dotenv').config();
const cors = require('cors')
const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookie_parser = require('cookie-parser')
const jwt = require('jsonwebtoken')

// middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.mrtaf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // connecting with created mongodb Database
    const jobscollection = client.db('Job_Portal').collection('Jobs')
    // connecting with newly created colllection in mongodb 
    const jobApplicationCollection = client.db('Job_Portal').collection('job-Applications')

    // auth related apis
    app.post('/jwt', (req, res) =>{
      const user = req.body
      const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, {expiresIn: '5h'})
      res.cookie('token', token, {
        httpOnly: true,
        secure: false
      })
      .send({success: true})
    })
    
    // removing token after logout
    app.post('/logout', (req, res) =>{
      res
      .clearCookie('token', {
        httpOnly: true,
        secure: false
      })
      .send({success:true})
    })
    
    // jobs related apis functionality
    app.get('/jobs', async(req, res) =>{
      const cursor = jobscollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/jobs/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await jobscollection.findOne(query)
      res.send(result)
    })

    // job application apis 
    app.post('/job-applications', async(req, res)=>{
      const jobApplication = req.body;
      const result = await jobApplicationCollection.insertOne(jobApplication)
      res.send(result)
    })

    // get data with specific user applied jobs 
    app.get('/job-applications', async(req, res) =>{
      const email = req.query.email;
      const query = {applicant_email: email}
      const result = await jobApplicationCollection.find(query).toArray()
      
      // fokira way aggregate applied jobs data 

      for (const application of result) {
        const query1 = {_id: new ObjectId(application.job_id)}
        const job = await jobscollection.findOne(query1)
        if (job) {
          application.title = job.title
          application.company = job.company
          application.location = job.location
          application.company_logo = job.company_logo
        }
      }


      res.send(result)
    })




  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('server is running')
})

app.listen(port, ()=>{
    console.log(`server is running on PORT: ${port}`);
})