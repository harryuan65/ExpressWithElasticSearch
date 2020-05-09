const express = require('express')
const app = express()

// ElasticSearch Node Client connection
const client = require('./src/utils/es_con')

if (!client) {
  console.log('Cannot connect to elasticsearch')
  process.exit(1)
} else {
  console.log('[ElasticSearch] Connected')
}

// OR
// var result = sass.renderSync({
//   data: scss_content
// });

const PORT = 3002
const path = require('path')
const bodyParser = require('body-parser')
app.set('view engine', 'ejs')
app.set('views', path.resolve('./src/views'))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const router = express.Router()
app.use('/css', express.static(path.join(__dirname, 'public/stylesheets/translated-css')))// 這一行一定要放在use router上面
app.use(router)

router.use((req, res, next) => {
  console.log(req.method, req.url)
  next()
})

function renderResult(res, code, obj){
  res.render('result', { title: 'Result',statusCode: code, result: JSON.stringify(obj, null ,2) })
}
function packBody(rawBody){
    // parse [ ['user', 'harry'] ] to [{ user: 'harry'}]
    var body = {}
    console.log('body:')
    rawBody.forEach(arrayPair => {
      if (arrayPair[0] !== '' && arrayPair[1] !== '') {
        body[arrayPair[0]] = arrayPair[1]
        console.log(`${arrayPair[0]} ${arrayPair[1]}`)
      }
    })
    return body;
}
router.get('/',(req, res) => {
  var hasIndex = false;

  client.cat.indices({"format": "json"}, function(err, resp, status){
     if(err){
        var data = JSON.stringify(err, null, 2)
        res.render('entry', { title: 'Home', hasIndex, data })
     }
     else{
        var data = JSON.stringify(resp, null, 2)
        var articleIndexInfo = resp.body.filter(e=>{if(e.index==='articles'){return e}});
        var hasIndex = !!articleIndexInfo.length;
        if (!hasIndex){
            res.render('entry', { title: 'Home', hasIndex, data })
        }else{
            client.search({
                index: 'articles',
                body:{
                   query:{
                       match_all:{}
                   }
                }
            }, function(err,resp,status){
                if(err){
                    var data = JSON.stringify(err, null, 2)
                    res.render('entry', { title: 'Home', hasIndex, data })
                }else{
                    var result = resp.body.hits.hits
                    var data = JSON.stringify(result, null, 2)
                    res.render('entry', { title: 'Home', hasIndex, data })
                }
            })
        }
     }
  })
})
router.get('/new_index',    (req, res) => { res.render('new_index', { title: 'New Index' }) })
router.get('/add_document', (req, res) => { res.render('add_document', { title: 'Add Document' }) })
router.get('/delete_document', (req, res) => { res.render('delete_document', { title: 'Delete Document' }) })
router.get('/delete_index', (req, res) => { res.render('delete_index', { title: 'Delete Index' }) })
router.get('/single_field_query',        (req, res) => { res.render('single_field_query', { title: 'Single Field Query' }) })
router.get('/multiple_fields_query',        (req, res) => { res.render('multiple_fields_query', { title: 'Multiple Fields Query' }) })
router.get('/update_by_query',       (req, res) => { res.render('update_by_query', { title: 'Update By Query' }) })
router.get('/playground',       (req, res) => { res.render('playground', { title: 'Playground' }) })
router.get('/result',       (req, res) => { res.render('result', { title: 'Result',statusCode: 200, result: JSON.stringify({
  type: 'dev page',
  message: 'Good day to you'
},null, 2) }) })

router.post('/create_index', (req, res) => {
  var newIndex = req.body.new_index
  //   res.status(200).send(`input:${JSON.stringify(req.body, null ,2)}`)
  if (!newIndex || newIndex === '') {
    renderResult(res, 400, {error: 'Invalid Input'})
  }

  client.indices.create({
    index: newIndex
  }, function (err, resp, status) {
    if (err) {
      console.log(err)
      renderResult(res, 400, err)
    } else {
      console.log('Success: true\n Response:', resp)
      renderResult(res, resp.statusCode, resp)
    }
  })
})
router.post('/delete_index', (req, res) => {
  var targetIndex = req.body.delete_index
  if (!targetIndex || targetIndex === '') {
    renderResult(res, 400, {error: 'Invalid Input'})
  }

  client.indices.delete({
    index: targetIndex
  }, function (err, resp, status) {
    if (err) {
      console.log(err)
      renderResult(res, 400, err);
    } else {
      console.log('Success: true\n Response:', resp)
      renderResult(res, resp.statusCode, resp)
    }
  })
})
router.post('/add_document', (req, res) => {
  var payload = req.body.new_document
  var isDev = Object.prototype.hasOwnProperty.call(payload, 'dev')
  if (!Object.prototype.hasOwnProperty.call(payload, 'index') ||
  !Object.prototype.hasOwnProperty.call(payload, 'body')) {
    res.status(400).send('Bad form data')
  }
  var index = payload.index
  var id = payload.id
  var type = payload.type
  var rawBody = payload.body

  var body = packBody(rawBody);
  if (isDev) {
    renderResult(res, 200, {
        thisIs: '你的資料打包好長這樣',
        index, id, type, body
    })
  } else {
    var newDocument = {
      index, body
    }
    if (id !== '') newDocument.id = id; //because it is optional
    if (type !== '') newDocument.type = type; //because it is optional, deprecated in futre

    client.index(
      newDocument,
    function (err, resp, status) {
      if (err) {
        console.log(err);
        renderResult(res, 400, err);
      } else {
        console.log(resp)
        renderResult(res, resp.statusCode, resp)
      }
    });// client.index
  }
})
router.post('/delete_document', (req, res) => {
    var payload = req.body.delete_document
    var isDev = Object.prototype.hasOwnProperty.call(payload, 'dev')
    if (!Object.prototype.hasOwnProperty.call(payload, 'id') ||
    !Object.prototype.hasOwnProperty.call(payload, 'index') ||
    !Object.prototype.hasOwnProperty.call(payload, 'type')) {
      res.status(400).send('Bad form data')
    }
    var index = payload.index
    var id = payload.id
    var type = payload.type

    if (isDev) {
      renderResult(res, 200, {
          thisIs: '你的資料打包好長這樣',
          index, id, type, body
      })
    } else {
      var targetDocument = {
        id, index, type
      }

      client.delete(
        targetDocument,
      function (err, resp, status) {
        if (err) {
          console.log(err);
          renderResult(res, 400, err);
        } else {
          console.log(resp)
          renderResult(res, resp.statusCode, resp)
        }
      });// client.index
    }
})
router.post('/single_field_query', (req, res) => {
    var payload = req.body.query_document
    var isDev = Object.prototype.hasOwnProperty.call(payload, 'dev')
    if (!Object.prototype.hasOwnProperty.call(payload, 'index')) {
      res.status(400).send('Bad form data')
    }
    var index = payload.index
    var type = payload.type
    var rawBody = payload.body

    // parse [ ['user', 'harry'] ] to [{ user: 'harry'}]
    var body = {},
        pair = rawBody[0];

    body[pair[0]] = pair[1];

    var queryDocument = {
        index, type, body:{
            query: {
                match: body
            }
        }
    }
    if (isDev) {
      renderResult(res, 200, {
          thisIs: '你的資料打包好長這樣',
          queryDocument
      })
    } else {


      client.search(
        queryDocument,
      function (err, resp, status) {
        if (err) {
          console.log(err);
          renderResult(res, 400, err);
        } else {
          console.log(resp)
          renderResult(res, resp.statusCode, resp)
        }
      });// client.index
    }
})
router.post('/multiple_fields_query', (req, res) => {
    var payload = req.body.query_document
    var isDev = Object.prototype.hasOwnProperty.call(payload, 'dev')
    if (!Object.prototype.hasOwnProperty.call(payload, 'index') ||
    !Object.prototype.hasOwnProperty.call(payload, 'query') ||
    !Object.prototype.hasOwnProperty.call(payload, 'fields')) {
      res.status(400).send({
          message: 'Bad form data',
          got: JSON.stringify(payload, null, 2)
      })
    }
    var index = payload.index,
        type = payload.type,
        query = payload.query,
        fields = payload.fields

    var queryDocument = {
        index, type, body:{
            query: {
                multi_match:{
                    query,
                    fields
                }
            }
        }
    }
    if (isDev) {
      renderResult(res, 200, {
          thisIs: '你的資料打包好長這樣',
          queryDocument
      })
      return;
    } else {


      client.search(
        queryDocument,
      function (err, resp, status) {
        if (err) {
          console.log(err);
          renderResult(res, 400, err);
        } else {
          console.log(resp)
          renderResult(res, resp.statusCode, resp)
        }
      });// client.index
    }
})
router.post('/update_by_query', (req, res) => {
    var payload = req.body.update_document
    var isDev = Object.prototype.hasOwnProperty.call(payload, 'dev')
    if (!Object.prototype.hasOwnProperty.call(payload, 'index') ||
    !Object.prototype.hasOwnProperty.call(payload, 'query') ||
    !Object.prototype.hasOwnProperty.call(payload, 'fields')) {
      res.status(400).send({
          message: 'Bad form data',
          got: JSON.stringify(payload, null, 2)
      })
    }
    var index = payload.index,
        type = payload.type,
        query = payload.query,
        fields = payload.fields

    var updateDocument = {
        index, type, body:{
            query: {
                multi_match:{
                    query,
                    fields
                }
            }
        }
    }
    if (isDev) {
      renderResult(res, 200, {
          thisIs: '你的資料打包好長這樣',
          updateDocument
      })
      return;
    } else {


      client.search(
        queryDocument,
      function (err, resp, status) {
        if (err) {
          console.log(err);
          renderResult(res, 400, err);
        } else {
          console.log(resp)
          renderResult(res, resp.statusCode, resp)
        }
      });// client.index
    }
})
router.post('playground', (req,res)=>{
    renderResult(res, 200, JSON.stringify(req.body.params));
})

app.listen(PORT, err => {
  if (err) return console.log(`Cannot Listen on PORT: ${PORT}`)
  console.log(`Server is Listening on : http://localhost:${PORT}/`)
})
