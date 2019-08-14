const express = require('express');
const app = express();
const port = 3333;
const fs = require('fs')
var sass = require('node-sass');



app.listen(port, () => console.log(`Example app listening on port ${port}!`));

app.use(express.json())

app.use('/', express.static('static'));
app.use('/preview',express.static('content'));


app.post('/compileStyle', function(req, res){
  var scssSource = '';

  for(var variable in req.body.vars){
    var value = req.body.vars[variable];
    scssSource += `$${variable} : ${value};\n`;
  }

  fs.readFile('content/' + req.body.file, 'utf8', function(err, contents) {
    if(err) return res.status(500).send({err:err});
    sass.render({
      data: scssSource + contents,
      includePaths: ['content/']
    }, function(err, result) {
      if(err) return res.status(500).send({err:err});
      res.send({css:result.css.toString()});
      console.log(result);
    });
  });

});


function getVarType(str){
  var colorRegex = /^(#|rgba)/;
  var numberRegex = /^\d(\.\d)?$/;
  var sizeRegex = /^\d(%|[a-z]+)$/;
  if(colorRegex.test(str)) return 'color';
  if(numberRegex.test(str)) return 'number';

  return 'size';
}

function postScssVars(req, res){
  fs.readFile('content/' + req.body.file, 'utf8', function(err, contents) {
    var varRegex = /\$(.+)\s*:\s*(.+)\s+!default;\s*(\/\/\s*(\{[^}]+\}))?/g;
    var commentsRegex = /\/\* -- (.+) -- \*\//g;
    var lastComment = '';
    var lastCommentIndex = 0;
    var comment = '';
    var commentIndex = 0;
    var vars = {}
    var m, cm;
    while(m = varRegex.exec(contents)){
      while(commentIndex < m.index && (cm = commentsRegex.exec(contents))){
        lastComment = comment;
        comment = cm[1];
        commentIndex = cm.index;
      }

      vars[m[1]] = {
        type: getVarType(m[2]),
        value: m[2],
        attributes: m[4] ? JSON.parse(m[4]) : {},
        group: lastComment
      };
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(vars));
  });
}

app.post('/getScssVars', postScssVars);
