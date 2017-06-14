var glb = {};
glb.tabs = {};
glb.item = new _ITEMLIST();
glb.item.initDB();
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    //console.log('Tab '+tabId+' in window '+removeInfo.windowId+', and the window is '+(removeInfo.isWindowClosing?'closed.':'open.'));
	console.log("关闭标签页%d", tabId);
	glb.tabs[tabId] = null;
});
chrome.tabs.onCreated.addListener(function (tab) {
	console.log("创建标签页%d", tab.id);
	glb.tabs[tab.id] = tab;
});
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {//当网址变化时
    //console.log('Tab '+tabId+' has been changed with these options:');
	console.log("标签页%d有变化", tabId);
	if (glb.tabs[tabId] && glb.tabs[tabId].callbackObj) {//如果该tab 注册了通知函数
		glb.tabs[tabId].callbackObj.tab = tab;
		console.log("向%s发消息...", glb.tabs[tabId].callbackObj.revTab.id);
		chrome.tabs.sendMessage(glb.tabs[tabId].callbackObj.revTab.id, glb.tabs[tabId].callbackObj, function (re) {//向通知函数发消息告知变化内容。
			console.log("收到回复:%s", re);
			if (re == 'ok' && glb.tabs[tabId]) glb.tabs[tabId].callbackObj = null;//如通知函数回复ok则删除，以后不再通知
		});
	}
});
chrome.webRequest.onBeforeSendHeaders.addListener(//网络请求过滤器
	function (details) {
		for (var i = 0; i < details.requestHeaders.length; ++i) {
            if (details.requestHeaders[i].name === "Referer") {//把请求头中的referer替换成请求URL
				details.requestHeaders[i].value=details.url;
            }else if(details.requestHeaders[i].name ==="Origin"){
				details.requestHeaders[i].value=/.*?com/.exec(details.url)[0];
			}
		}
		console.log(details);
		return { requestHeaders: details.requestHeaders };
	},
	{ urls: ["*://pub.alimama.com/*"] },//urls: ["<all_urls>"] 
	["blocking", "requestHeaders"]
);
chrome.webRequest.onCompleted.addListener (
	function(details) {
		console.log(details);
			return true;
	},
	{urls:["http://www.www.com/"]},
	["responseHeaders"] 
)
chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
	if (request.type == 'gajax') {
		$.ajax({
			type: 'GET',
			url: request.url,
			success: function (data) {
				sendResponse({
					msg: 'ok',
					data: data
				});
			},
			error: function () {
				sendResponse({
					msg: 'error'
				});
			}
		});
	} else if (request.type == 'pajax') {
		$.ajax({
			type: 'POST',
			url: request.url,
			data: request.postdata,
			success: function (data) {
				sendResponse({
					msg: 'ok',
					data: data
				});
			},
			error: function () {
				sendResponse({
					msg: 'error'
				});
			}
		});
	}
});
chrome.runtime.onMessage.addListener(function (message, sender, reFunc) {
    if (message.action == 'createTab') {
		chrome.tabs.create(message.data, function (tab) {
			if (message.callbackObj) {
				glb.tabs[tab.id].callbackObj = message.callbackObj;
				glb.tabs[tab.id].callbackObj.revTab = sender.tab;
			}
			reFunc(tab);
		});
		return true;//异步一定要return true;
    }
	else if (message.action == 'tabs_executeScript') {
		chrome.tabs.executeScript(message.tabId, {
			code: message.code,
			allFrames: true,
			runAt: 'document_start'
		}, function (resultArray) {
			console.log(resultArray);
			reFunc(resultArray);
		});
		return true;
	}
	else if (message.action == 'tabs_query') {
		chrome.tabs.query(message.data, function (tabArray) {
			//console.log(tabArray);
			reFunc(tabArray);
		});
		return true;
	}
	else if (message.action == 'tabs_remove') {
		if (message.id && glb.tabs[message.id]) {
			chrome.tabs.remove(message.id, function () {
				//console.log('The tabs has been closed.');
				reFunc("ok");
				//console.log('cannot find tab.');
			})
			return true;
		}
		else {
			reFunc("nofind");
		}
	}
	else if (message.action == 'tabs_reload') {
		if (message.id && glb.tabs[message.id]) {
			chrome.tabs.reload(message.id, {
				bypassCache: true
			}, function () {
				//console.log('The tab has been reloaded.');
				reFunc("ok");
			});
			return true;
		}
		else {
			reFunc("nofind");
		}
	}
    else if (message.action == 'item_put') {
		glb.item.put(message.val, message.key)
			.then(function (re) {
				reFunc({ ok: true, data: re });
			})
			.fail(function (re) {
				reFunc({ err: true, data: re });
			});
		return true;//异步一定要return true;
    }
    else if (message.action == 'item_getLocalitemlist') {
		glb.item.getLocalitemlist(message.key)
			.then(function (re) {
				reFunc({ ok: true, data: re });
			})
			.fail(function (re) {
				reFunc({ err: true, data: re });
			});
		return true;//异步一定要return true;
    }
    else if (message.action == 'item_delete') {
		glb.item.delete(message.key)
			.then(function (re) {
				reFunc({ ok: true, data: re });
			})
			.fail(function (re) {
				reFunc({ err: true, data: re });
			});
		return true;//异步一定要return true;
    }
	else if (message.action == 'getmytab') {//返回发送者tab
		reFunc(sender.tab);
	}
	else if (message.action == 'reg') {//注册TAB ID
		glb.tabList = glb.tabList || {};
		glb.tabList[message.hostname] = sender.tab;
		reFunc([message.hostname, glb.tabList[message.hostname].id]);
	}
	else if (message.action == 'saveData') {//保存数据
		$.each(message.data, function (i, v) {
			var t = typeof v;
			if (t == "object")
				localStorage[i] = JSON.stringify(v);
			else
				localStorage[i] = v;
		});
		reFunc("数据保存成功!");
		return true;
	}
	else if (message.action == 'sendToTabDoString') {//传递消息
		if (glb.tabList[message.hostname]) {
			chrome.tabs.sendMessage(glb.tabList[message.hostname].id, message.data, function (re) { reFunc(re) });
			return true;
		}
		else
			reFunc("没找到" + message.hostname);
	}
	else if (message.action == 'getData') {
		$.each(message.data, function (i, v) {
			if (localStorage[i]) {
				var t = typeof message.data[i];
				if (t == 'string')
					message.data[i] = localStorage[i];
				else if (t == 'number')
					message.data[i] = Number(localStorage[i]);
				else if (t == "object")
					message.data[i] = JSON.parse(localStorage[i]);
				else
					message.data[i] = localStorage[i];
			}
		});
		//chrome.tabs.sendMessage(glb.tabList["shihuizhu"].id,{action:"alert",msg:"test"},function(){});
		console.log(message.data);
		reFunc(message.data);
		return true;
	}
	else {
		console.log("这是什么:%o", message);
		reFunc("whatUwant?%o", message);
	}
});
