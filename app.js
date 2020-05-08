const express = require("express");
let app = express();
const { Client } = require('@elastic/elasticsearch');
var client = new Client({node: 'http://localhost:9200'});

const PORT = 3002;
const path = require("path");
const bodyParser = require("body-parser");
app.set("view engine","ejs");
app.set("views",path.resolve("./src/views"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

const router = express.Router();
app.use(express.static(path.join(__dirname,'/public')));//這一行一定要放在use router上面
app.use(router);

router.use((req,res,next) => {
 console.log(req.method, req.url);

//  res.setHeader('Access-Control-Allow-Origin','http://localhost:4021');
 res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, PATCH, DELETE');
 res.setHeader('Access-Control-Allow-Headers','X-Requested-With, content-type');
 next();
});

router.get('/',(req,res)=>{
    res.render('index');
})

router.post('/_search/',(req,res)=>{
    client.search({
        index:'workrecord',
        body: {
            query:{
                match:{ duration:req.params.str }
            }
       }
    },(err,result)=>{
        console.log(result)
        if(err){
            return res.status(400).send({
                message:`Search Errored ${err}`
            })
        }
        else{
            console.log("FOUND ",result);
            return res.status(200).send({
                message:"data found",
                data: result
            })
        }
    })


})
router.get('/workrecord/:id',(req,res)=>{
    let workrecord;
    client.get({
        index: 'workrecord',
        type: 'mytype',
        id:req.params.id,
    }, function(err ,resp, status){
        if(err){
            console.log(err);
            return res.status(400).send({
                message: "BAD REQ"
              })
        }
        else{
            workrecord = resp._source;
            console.log(`Got Search Results`,workrecord);
            if(!workrecord){
                return res.status(400).send({
                message: "BAD REQ"
              })
            }
            else{
                console.log(workrecord)
                return res.status(200).send({
                    message: "Get status OK with data",
                    workrecord: workrecord
                })
            }
        }
    })

})
router.post('/workrecord',(req,res)=>{

    if(!req.params.id){
        return res.status(400).send({
            message: "Id is required"
        })
    }

    client.index({
        index:'workrecord',
        type: 'mytype',
        id: req.body.id,
        body: req.body
    }, function(err,response,status){
        if(err){
            console.log('ERRRORR')
            console.log(err);
        }else{
            return res.status(200).send({
                message: "Sucessed POST request. YEEEEEEEEEEEE"
            })
        }
    })


})

app.listen(PORT, err =>{
    if(err) return console.log(`Cannot Listen on PORT: ${PORT}`) ;
    console.log(`Server is Listening on : http://localhost:${PORT}/`);
});

