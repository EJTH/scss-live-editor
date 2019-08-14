var waitForIt = false;
var scssFileStyles = {};
var scssVars = {};
var varGroups = {};
var iframe;
var frameSet = document.querySelector('.frame-wrapper');
var dockBtn = document.getElementById('dockBtn');
var settingsBar = document.getElementById('settingsBar');
var settingsArea = document.getElementById('settingsArea');
var previewArea = document.getElementById('previewArea');

var docks = [
  ['vertical', 'left'], [], ['vertical', 'right'],
];

function postJSON(url, data, cb){
  var xhr = new XMLHttpRequest();
  xhr.open("POST", url);

  xhr.onreadystatechange = function() {
      if (this.readyState == 4) {
         // Typical action to be performed when the document is ready:
         cb(JSON.parse(xhr.responseText));
      }
  };
  xhr.onerror = function(){
    waitForIt = false;
  }
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

 // send the collected data as JSON
 xhr.send(JSON.stringify(data));
}

function getVarGroup(groupName){
  var settings = document.getElementById('settings');
  if(!varGroups[groupName]){
    var div = document.createElement('div');
    var label = document.createElement('label');
    label.innerText = groupName;
    div.classList.add('var-group');
    div.classList.add('collapsed');
    label.addEventListener('click', function(){
      div.classList.toggle('collapsed');
    })
    div.appendChild(label);
    settings.append(div);
    varGroups[groupName] = div;

  }
  return varGroups[groupName];
}

function createSettings(file, cb){
  postJSON('/getScssVars', {file: file}, function(vars){
    scssVars = vars;
    for(var varName in vars){
      var info = vars[varName];

      var div = document.createElement('div');
      var label = document.createElement('label');
      var group = getVarGroup(info.group);

      var input = document.createElement('input');
      for(var k in info.attributes){
        input[k] = info.attributes[k];
      }

      if(info.attributes.choices){
        input = document.createElement('select');
        info.attributes.choices.forEach(function(c,i){
          var opt  = document.createElement('option');
          opt.value = c;
          opt.innerText = c;
          input.appendChild(opt);

          if(c.trim()==info.value.trim()){
            input.activeIndex = i;
          }
        });
      } else {
        if(info.attributes && info.attributes.type == "range"){
          var unit = (""+info.value).match(/(%|[a-z]+)$/);
          input.value = parseFloat(info.value);
          if(unit) input.unit = unit[0];
        } else {
          input.type = info.type;
          input.value = info.value;
        }
      }

      info.input = input;


      input.addEventListener('input', getPreview);




      label.innerText = input.label || varName;



      div.appendChild(label);
      div.appendChild(input);
      group.appendChild(div);
    }
    cb();
  });
}

function serializeSettings(){
  var res = {};
  for(var name in scssVars){
    var info = scssVars[name];
    res[name] = info.input.value + (info.input.unit||"");
  }
  return res;
}

function initializePreview(ifr){
  iframe = ifr;
  settingsBar.addEventListener('dblclick', function(){
    setDock();
  });
  dragResize();
  dockBtn.addEventListener('click', function(){
    setDock();
  });
  var filesLoaded = 0;
  var filesTotal = 0;
  iframe.contentDocument.querySelectorAll('link').forEach(function(el){
    if(el.href.match(/\.scss$/)){
      filesTotal++;
      var file = el.href.replace(/^https?:\/\/.+\//,'');
      var style = iframe.contentDocument.createElement('style');
      scssFileStyles[file] = style;
      iframe.contentDocument.head.appendChild(style);
      el.remove();
      createSettings(file, function(){
        filesLoaded++;
        if(filesTotal == filesLoaded) getPreview();
      });
    }
  });
  setDock(0);
}

function getPreview(){
  if(waitForIt) return;
  waitForIt = true;
  var settings = serializeSettings();
  var files = 0;
  for(var file in scssFileStyles){
    var style = scssFileStyles[file];
    postJSON('/compileStyle',{
      vars: settings,
      file: file
    }, function(result){
      if(!result.err) style.innerHTML = result.css;
      files++;
      if(files == Object.keys(scssFileStyles).length){
        setTimeout(function(){
          waitForIt = false;
        }, 100);
      }
    });
  }
}

var currentDock = 0;

function setDock(dock){
  if(dock == undefined){
    currentDock++;
    if(currentDock == docks.length) currentDock = 0;
    dock = currentDock;
  }

  docks.forEach(function(classes){
    classes.forEach(function(cls){
      frameSet.classList.remove(cls);
    });
  });

  docks[dock].forEach(function(cls){
    frameSet.classList.add(cls);
  });

  currentDock = dock;

  settingsArea.style.width = '';
  settingsArea.style.height = '';
  previewArea.style.width = '';
  previewArea.style.height = '';
}


function dragResize(){
  var directions = [[-1,0],[0,1],[1,0]];
  var dragging = false;
  var sx,sy;
  var sw,sh;
  settingsBar.addEventListener('mousedown', function(evt){
    sx = evt.clientX;
    sy = evt.clientY;
    sw = settingsArea.clientWidth;
    sh = settingsArea.clientHeight;
    dragging = true;
    iframe.style.pointerEvents = 'none';
  });

  settingsBar.addEventListener('mouseup', function(evt){
    dragging = false;
    iframe.style.pointerEvents = '';
  });

  frameSet.addEventListener('mousemove', function(evt){
    if(!dragging)return;
    var dir = directions[currentDock];
    var dx = (sx - evt.clientX) * dir[0];
    var dy = (sy - evt.clientY) * dir[1];

    var nw = ((sw + dx) / frameSet.clientWidth * 100);
    var nh =  ((sh + dy) / frameSet.clientHeight * 100);

    settingsArea.style.width = nw + '%';
    settingsArea.style.height = nh + '%';
    if(dir[0] != 0) previewArea.style.width = 100-nw + '%';
    else previewArea.style.height = 100-nh + '%';
  });
}
