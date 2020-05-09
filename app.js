const express = require("express");
let app = express();

// ElasticSearch Node Client connection
const client = require('./src/utils/es_con');

if(!client){
  console.log('Cannot connect to elasticsearch');
  process.exit(1);
}else{
    console.log('[ElasticSearch] Connected');
}

// OR
// var result = sass.renderSync({
//   data: scss_content
// });

const PORT = 3002;
const path = require("path");
const bodyParser = require("body-parser");
app.set("view engine","ejs");
app.set("views",path.resolve("./src/views"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

const router = express.Router();
app.use('/css', express.static(path.join(__dirname,'public/stylesheets/translated-css')));//這一行一定要放在use router上面
app.use(router);

router.use((req,res,next) => {
 console.log(req.method, req.url);

//  res.setHeader('Access-Control-Allow-Origin','http://localhost:4021');
 res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, PATCH, DELETE'); //Node.js native method
//  res.setHeader('Access-Control-Allow-Headers','X-Requested-With, content-type');
 next();
});

router.get('/',      (req,res)=>{res.render('entry',{title: 'Home'});})
router.get('/new_index',(req,res)=>{res.render('new_index',{title: 'New Index'});})
router.get('/add_document',(req,res)=>{res.render('add_document',{title: 'Add Document'});})
router.get('/delete_index',(req,res)=>{res.render('delete_index',{title: 'Delete Index'});})
router.get('/query', (req,res)=>{res.render('query',{title: 'Query'});})
router.get('/update',(req,res)=>{res.render('update',{title: 'Update'});})

router.post('/create_index',(req,res)=>{
  var newIndex = req.body.new_index;
//   res.status(200).send(`input:${JSON.stringify(req.body, null ,2)}`)
  if(!newIndex||newIndex==""){
    res.status(400).send('Invalid Input');
  }

  client.indices.create({
      index: newIndex
    },function(err,resp,status) {
      if(err) {
        console.log(err);
        res.status(400).send({
            statusCode: resp.statusCode,
            body: resp.body
        })
      }
      else {
        console.log("Success: true\n Response:",resp);
        res.header("Content-Type",'application/json'); //res.header:express method, res.setHeader: node native method
        res.status(resp.statusCode).send({
            statusCode: resp.statusCode,
            body: resp.body
        })
      }
  });
});
router.post('/delete_index',(req,res)=>{
    var targetIndex = req.body.deleter_index;
  //   res.status(200).send(`input:${JSON.stringify(req.body, null ,2)}`)
    if(!targetIndex||targetIndex==""){
      res.status(400).send('Invalid Input');
    }

    client.indices.delete({
        index: targetIndex
      },function(err,resp,status) {
        if(err) {
          console.log(err);
          res.status(400).send({
              statusCode: resp.statusCode,
              body: resp.body
          })
        }
        else {
          console.log("Success: true\n Response:",resp);
          res.status(resp.statusCode).send({
              statusCode: resp.statusCode,
              body: resp.body
          })
        }
    });
})
router.post('/add_document',(req,res)=>{
  var payload = req.body.new_document;
  var isDev = payload.dev;
  if(!payload.hasOwnProperty('index') || !payload.hasOwnProperty('type') || !payload.hasOwnProperty('body')){
    res.status(400).send('Bad form data');
  }
  var index = payload.index,
      id = payload.id,
      type = payload.type,
      raw_body = payload.body

  // parse [ ['user', 'harry'] ] to [{ user: 'harry'}]
  var body = {}
  console.log('body:')
  raw_body.forEach(arrayPair=>{
      if(arrayPair[0]!="" && arrayPair[1]!=""){
        body[arrayPair[0]] = arrayPair[1]
        console.log(`${arrayPair[0]} ${arrayPair[1]}`)
      }
  })
  if(isDev){
    res.header("Content-Type",'application/json'); //res.header:express method, res.setHeader: node native method
    res.status(200).send({
        index, id, type, body
    });
  }
  else{
    var newDocument = {
        index,
        type,
        body
    }
    if(id!=""){
      newDocument['id'] = id
    }
    client.index({
        newDocument
      },
      function(err,resp,status) {
        if(err) {
            console.log(err);
            res.status(400).send({
                statusCode: resp.statusCode,
                body: resp.body
            })
          }else{
            console.log(resp);
            res.header("Content-Type",'application/json');
            res.status(resp.statusCode).send({
                statusCode: resp.statusCode,
                body: resp.body
            })
          }
      });
  }

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

