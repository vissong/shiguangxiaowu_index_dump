var RGX = /([^{]*?)\w(?=\})/g;

var dict = {
	YYYY: 'getFullYear',
	YY: 'getYear',
	MM: function (d) {
		return d.getMonth() + 1;
	},
	DD: 'getDate',
	HH: 'getHours',
	mm: 'getMinutes',
	ss: 'getSeconds'
};
function arrayBufferToBase64( buffer ) {
  var binary = '';
  var bytes = new Uint8Array( buffer );
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
  }
  return window.btoa( binary );
}

function tinydate(str) {
	var parts=[], offset=0;
	str.replace(RGX, function (key, _, idx) {
		// save preceding string
		parts.push(str.substring(offset, idx - 1));
		offset = idx += key.length + 1;
		// save function
		parts.push(function(d){
			return ('00' + (typeof dict[key]==='string' ? d[dict[key]]() : dict[key](d))).slice(-key.length);
		});
	});

	if (offset !== str.length) {
		parts.push(str.substring(offset));
	}

	return function (arg) {
		var out='', i=0, d=arg||new Date();
		for (; i<parts.length; i++) {
			out += (typeof parts[i]==='string') ? parts[i] : parts[i](d);
		}
		return out;
	};
}

var stamp = tinydate('{YYYY}-{MM}-{DD} {HH}:{mm}:{ss}');

function ajax(url) {
  return new Promise(function(resolve, reject) {
    var s = (xmlhttp = new XMLHttpRequest());
    s.onreadystatechange = function() {
      if (xmlhttp.readyState == 4) {
        // 4 = "loaded"
        if (xmlhttp.status == 200) {
          resolve(xmlhttp.responseText);
        } else {
          reject(xmlhttp.statusText);
        }
      }
    };
    s.open("GET", url, true);
    s.send(null);
  });
}


// "http://'+currDomain+'/events/442865714823481109.json"
// http://'+currDomain+'/events.json?baby_id=964657

var data = [];
var baby_id = "";

var p = 0
var v = 0

var downloading = false

var next = ''

var request_count = 1

var ids = [];
var details = []

var current = 0;

function sleep (ms) {
  return new Promise(function(resolve, reject) {
    setTimeout(function(){
      resolve(1)
    }, parseInt(ms || 200))
  })
}

window.URL = window.URL || window.webkitURL;

function b64toBlob(b64Data, contentType, sliceSize) {
  contentType = contentType || '';
  sliceSize = sliceSize || 512;

  var byteCharacters = atob(b64Data);
  var byteArrays = [];

  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);

    var byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    var byteArray = new Uint8Array(byteNumbers);

    byteArrays.push(byteArray);
  }

  var blob = new Blob(byteArrays, {type: contentType});
  return blob;
}

// 下载具体影集中的照片
function getDetail(id) {
  addTip(request_count+'/'+ids.length)
  request_count++

  var url = 'http://'+currDomain+getSignPath('/events/'+id+'.json');

  return ajax(
    url
  ).then( res => {
    var result = JSON.parse(res)
    if (result.moments && 1) {
      result.moments.forEach(element => {
        var cache = {};
        cache["id_str"] = element.id_str;
        cache["type"] = element.type;
        cache["content"] = element.content;
        if (element.type == "rich_text") {
          cache["content"] = element.fields.moments[0].content;
        }
        cache["picture"] = element.picture;
        cache["original_video_path"] = element.original_video_path;
        cache["taken_at_gmt"] = element.taken_at_gmt;
        details.push(cache);
      });
      // 只保留有必要使用的字段到缓存中

      localStorage.setItem('CACHED_DATA', JSON.stringify(details))
    }
    return 1
  })
}

// 对请求路径计算签名
function getSignPath(e) {
  var t = Math.round((new Date).getTime() / 1e3).toString()
    , n = e.indexOf("?") > -1 ? e + "&timestamp=" + t : e + "?timestamp=" + t;
  return n + "&sign=" + md5(md5(n) + ":::6027a6b45d762a772b97779f078f2065")
}

// 拉取影集列表
// cb = downdata
function get(before, cb) {
  addTip('正在加载')
  var str = before ? "&before=" + before : "";
  var url = 'http://'+currDomain+getSignPath('/events.json?v=2&width=700&include_rt=true&baby_id=' + baby_id + str);

  return ajax(
    url
  ).then(res => {
    var result = JSON.parse(res);
    var data = result.list
    data.forEach(function(item) {
      item.layout_detail && ids.push(item.id_str)
    });
    if (result.next) {
      next = result.next + 1
      return sleep(300).then(function() {
        get(next, cb);
        return 1
      })
    } else {
      ids.reduce(function(chain, item){
        return chain.then(function() {
          return getDetail(item)
        }).then(function() {
          return sleep(300)
        })
      }, Promise.resolve()).then(() => {
        cb && cb();
      })
    }
  }).catch(function(e) {
    console.log(e)
    document.getElementById('download_btn').textContent = '下载'
    downloading = false;
    addTip('下载失败，请重新点击下载数据' + url)
  })
}

let errors = [];
function downloadData() {
  var blob = new Blob([localStorage.CACHED_DATA], {type: "application/json;charset=utf-8"});
  var url = window.URL.createObjectURL(blob);
  // 创建隐藏的可下载链接
  var eleLink = document.createElement('a');
  eleLink.download = "data.json";
  eleLink.style.display = 'none';
  // 字符内容转变成blob地址
  eleLink.href = url;
  // 触发点击
  eleLink.click();

  addTip("资源索引已经完成，请使用下载工具下载")
}

var currDomain = 'shiguangxiaowu.cn';

// 页面打开初始化
function init() {
  if (/shiguangxiaowu\.cn/.test(location.href) || /peekaboomoments\.com/.test(location.href)) {
    var reg = location.href.match(/home\/(\d{1,})/);
    if (!reg || !reg[1]) return;
    chrome.runtime.sendMessage({msg: 'hello world'});
    baby_id = reg[1];
    var btn = document.createElement('div')
    btn.style = "box-shadow:1px 2px 3px black;cursor:pointer;font-size: 18px;line-height: 42px;border-radius: 10px;text-align: center;width: 100px;height: 42px; background-color: #33b282;color: #fff;position: fixed;bottom: 10%;right: 10%;z-index: 9;"
    btn.textContent = '下载'
    btn.id = 'download_btn'
    document.body.appendChild(btn)

    btn.onclick = function() {
      if (downloading) return;
      get(null, downloadData);
      addTip('开始加载数据')
      btn.textContent = '正在加载...'
      downloading = true
    }
  }
}

let zindex = 99;


function addTip(msg) {
  var d = document.createElement('div')
  zindex++;
  d.style=`color: #fff;border-radius: 10px;top:50%;left:50%;position:fixed;z-index:${zindex};max-width:320px;text-align:center;padding: 10px 20px;background-color: rgba(0,0,0,.75);`
  d.textContent = msg
  document.body.appendChild(d)
  setTimeout(function() {
    document.body.removeChild(d)
  }, 3500)
}

init();
