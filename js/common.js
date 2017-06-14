console.log("hello,im common.js");
var promiseList={
	promises:[],
	getpromiss:function(index){
		return index>=this.promises.length?null:this.promises[index];
	},
	reject:function(index,msg){
		return index>=this.promises.length?null:this.promises[index].reject(msg);
	},
	resolve:function(index,msg){
		return index>=this.promises.length?null:this.promises[index].resolve(msg);
	},
	add:function(promise_){
		return this.promises.push($.Deferred())-1;
	},
	delete:function(index){
		index>=this.promises.length?null:this.promises[index]=null;
	}
};
var _COMMON=function(_param){
	var that=this;
	this.ratetype={pt:"普通",gy:"鹊桥",dx:"定向"};
	this.param=$.extend({},{
		hostname:location.hostname,
		myhref:"http://127.0.0.1:3000/"
	},_param);
	this.sendToBackground=function(msg){//向后台发消息,promiss写法
		var def = $.Deferred();
		chrome.runtime.sendMessage(msg, function(response){
			def.resolve(response);
		});
		return def;
	};
	this.regmytab=function(){//向后台注册tab
		var msg={
			action:"reg",
			hostname:this.param.hostname
		};
		console.log("向后台注册tab...");
		this.sendToBackground(msg).done(function(re){
			console.log(re);
		});
	};
	this._init=function(){//构造
		this.addMessageListener();
		this.regmytab();
	};
	this._init();
	this.getToken=function(itemObj){
		var _info={
			adzoneid:'',
			siteid:'',
			_tb_token_:'',
			setup_tail:''
		}
		return that.sendToBackground({action:'getData',data:_info})
		.then(function(info){
			$.extend(itemObj,info);
			return itemObj;
		})
	};
	this.saveDataToBack=function(data){
		return this.sendToBackground({action:'saveData',data:data});
	};
	this.getCookie=function(c_name){
		if (document.cookie.length>0){
			c_start=document.cookie.indexOf(c_name + "=");
			if (c_start!=-1){ 
				c_start=c_start + c_name.length+1;
				c_end=document.cookie.indexOf(";",c_start);
				if (c_end==-1) c_end=document.cookie.length;
				return unescape(document.cookie.substring(c_start,c_end));
			} 
		}
		return "";
	};
	this.setCookie=function(name,value){ 
		var Days = 365; 
		var exp = new Date(); 
		exp.setTime(exp.getTime() + Days*24*60*60*1000); 
		document.cookie = name + "="+ escape (value) + ";path=/;expires=" + exp.toGMTString(); 
	};
	this.saveItemObjToback=function(itemObj){//保存item到本地
		return that.sendToBackground({action:'item_put',val:itemObj})
		.then(function(re){return itemObj})
	}
};
_COMMON.prototype.addMessageListener=function(){//监听后台发来的消息
	chrome.runtime.onMessage.addListener(function(message, sender, reFunc){
		switch(message.action){
			case 'alert':
				alert(message.msg);
				reFunc("ok");
				break;
			case 'run':
				if (typeof message.func =='function'){//执行程序
					message.func(reFunc);
					return true;
				}
				else{
					eval(message.func);//执行字符串
					reFunc("ok");
				}
				break;
			default:
				reFunc("whatuwant?");
				break;
		}
		return message.return||false;
	});
}
_COMMON.prototype.getDateTime=function(fmt){
	var _date=new Date();
    var o = {//("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
        "M+": _date.getMonth() + 1, //月份 
        "d+": _date.getDate(), //日 
        "h+": _date.getHours(), //小时 
        "m+": _date.getMinutes(), //分 
        "s+": _date.getSeconds(), //秒 
        "q+": Math.floor((_date.getMonth() + 3) / 3), //季度 
        "S": _date.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (_date.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
		if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};
_COMMON.prototype.postJson=function(url,json,callback){//提交JSON数据
	var _ajax={
		type: "POST",
		url: url,
		data: JSON.stringify(json),
		contentType:"application/json",
		success: function(msg){
			callback(msg);
		}
	}
	return $.ajax(_ajax);
};
_COMMON.prototype.savetoweb=function(data,callback){
	console.log("正在提交数据,还剩"+data.length);
	var newArr=[];
	var _max=50;
	for(var i=0;i<_max;i++){//分割数组，分批提交
		var _tmp=data.pop();
		if(!_tmp)break;
		newArr.push(_tmp);
	}
	if(newArr.length==0){
		console.log("提交完成...");
		callback&&callback("ok");
		return;
	};
	this.postJson(this.param.myhref+"itemmanage/insertitem",{item:newArr},function(re){
		console.log(re);
	}).done(function(){
		this.savetoweb(data,callback);
	}.bind(this));
}
_COMMON.prototype.checkValidity_coupon=function(itemObj){//检查优惠卷有效性
	if(!itemObj.couponurl)//没有地址
		return itemObj;
	console.log("正在检查优惠券有效性...");
	var haveReg = new RegExp("已领用|确认领取");
	return $.get(itemObj.couponurl)
	.fail(function(){return $.Deferred().reject({msg:"出错了..."})})
	.then(function(re){
		var coupon=/(\d+)元优惠券/.exec(re);
		if(coupon){
			if(Number(itemObj.coupon)>0&&Number(coupon[1])!=Number(itemObj.coupon)){
				console.warn("优惠券与实际不一致   %d!=%d",Number(coupon[1]),Number(itemObj.coupon));
			}
			itemObj.coupon=coupon[1]||itemObj.coupon;
		}
		else if(haveReg.test(re))
			console.log("天猫优惠券？");
		else
			return $.Deferred().reject({msg:itemObj.title+"已过期...",itemObj:itemObj});
		return itemObj;
	});
}
_COMMON.prototype.getCommonCampaign=function(itemObj){//获得定向计划列表
	if(!itemObj.rate.dx)
		return itemObj;
	if(itemObj.rate.dx.use&&itemObj.rate.dx.use.ExistStatus==2)//已经申请成功
		return itemObj;
	console.log("获取定向列表...");
	return $.getJSON("http://pub.alimama.com/pubauc/getCommonCampaignByItemId.json",{itemId:itemObj.gid,_tb_token_:itemObj._tb_token,pvid:itemObj.pvid,t:new Date().getTime()})
	.fail(function(){
		console.log("请登录阿里妈妈...");
		alert("请登录阿里妈妈...");
	})
	.then(function(json){
		console.log(json);
		if(!(json.data instanceof Array)){//没有计划列表
			console.log("没有计划列表...");
			itemObj.rate.dx=null;
			return itemObj;
		}
		itemObj.rate.dx.commonCampaign=json;
		itemObj.rate.dx.commonCampaign.data.sort(function(a,b){//排序
			return b.commissionRate-a.commissionRate;
		});
		return itemObj;
	})
};
_COMMON.prototype.applyForCommonCampaign=function(itemObj){//申请定向计划
	if(!itemObj.rate.dx)
		return itemObj;	
	if(itemObj.rate.dx.use&&itemObj.rate.dx.use.ExistStatus==2)//已经申请成功
		return itemObj;
	var gy=itemObj.rate.gy.data.pageList?itemObj.rate.gy.data.pageList[0].eventRate:0;
	var pt=itemObj.rate.pt.data.pageList?itemObj.rate.pt.data.pageList[0].tkRate:0;	
	var _ii=-1;
	$.each(itemObj.rate.dx.commonCampaign.data,function(i,v){
		if(v.commissionRate>=gy&&v.commissionRate>=pt&&v.Properties=="否"){//佣金大于等于显示佣金并且自动审核
			_ii=i;
			return false;
		}
	});
	if(_ii==-1){
		console.log("没有合适的计划...");
		itemObj.rate.dx=null;
		return itemObj;	
	};
	if(itemObj.rate.dx.commonCampaign.data[_ii].ExistStatus==2){//已通过审核
		console.log(itemObj.rate.dx.commonCampaign.data[_ii].CampaignName+"计划已通过审核...");
		itemObj.rate.dx.use=itemObj.rate.dx.commonCampaign.data[_ii];
		return itemObj;	
	};
	var _postdata={
		campId:itemObj.rate.dx.commonCampaign.data[_ii].CampaignID,
		keeperid:itemObj.rate.dx.commonCampaign.data[_ii].ShopKeeperID,
		applyreason:'淘客',
		t:new Date().getTime(),
		_tb_token_:itemObj._tb_token_,
		pvid:itemObj.pvid
	}
	console.log("开始申请定向计划...");
	return $.post("http://pub.alimama.com/pubauc/applyForCommonCampaign.json",_postdata,'json')//开始申请
	.fail(function(){
		console.log("请登录阿里妈妈...");
		alert("请登录阿里妈妈...");
	})
	.then(function(json){
		if(json&&json.ok){
			itemObj.rate.dx.apply=json;
			itemObj.rate.dx.use=itemObj.rate.dx.commonCampaign.data[_ii];
			return itemObj;
		}
		else{
			console.log("申请定向计划没通过...");
			itemObj.rate.dx=null;
			return itemObj;
		}
	})
}
_COMMON.prototype.isinDxlist=function(itemObj){
	var that=this;
	if(!itemObj.rate.dx)
		return itemObj;	
	if(!itemObj.rate.dx.use)
		return itemObj;	
	var _param={
		campaignId:itemObj.rate.dx.use.CampaignID,
		shopkeeperId:itemObj.rate.dx.use.ShopKeeperID,
		t:new Date().getTime(),
		pvid:'',
		_tb_token_:itemObj._tb_token_,
		_input_charset:'utf-8'	
	}
	console.log("校验商品是否在计划列表中...");
	return $.getJSON("http://pub.alimama.com/campaign/campaignDetail.json",_param)
	.then(function(json){
		itemObj.campaignDetail=json;
		if(json.ok){
			itemObj.oriMemberid=json.data.oriMemberid;
			return that._isinDxlist(itemObj);
		}
		else{
			console.log("校验商品是否在计划列表中失败...");
			return itemObj;
		}		
	})
}
_COMMON.prototype._isinDxlist=function(itemObj){
	var that=this;
	if(!itemObj.campaignDetail)
		return itemObj;
	var _param={
		campaignId:itemObj.rate.dx.use.CampaignID,
		shopkeeperId:itemObj.rate.dx.use.ShopKeeperID,
		tab:2,
		toPage:itemObj.toPage,
		omid:itemObj.oriMemberid,
		perPagesize:10,
		t:new Date().getTime(),
		pvid:'',
		_tb_token_:itemObj._tb_token_,
		_input_charset:'utf-8'		
	}
	return $.getJSON("http://pub.alimama.com/campaign/merchandiseDetail.json",_param)
	.then(function(json){
		if(json.ok){
			var isfind=false;
			var gid=Number(itemObj.gid);
			$.each(json.data.pagelist,function(i,v){
				if(v.auctionId==gid&&v.commissionRatePercent>=itemObj.rate.dx.use.commissionRate){//找到了
					console.log("第"+json.data.paginator.page+"页中有此商品...");
					isfind=true;
					return false;
				}
			});
			if(isfind)
				return itemObj;
			if(json.data.paginator.page==json.data.paginator.pages){//已是最后一页
				console.log("列表中没有此商品...");
				itemObj.rate.dx.use=null;
				return itemObj;
			}
			else{
				itemObj.toPage=json.data.paginator.nextPage;//请求下一页
				console.log("请求第"+json.data.paginator.nextPage+"页...");
				return that._isinDxlist(itemObj);
			}
		}
		else{
			console.log("校验商品是否在计划列表中失败1...");
			return itemObj;
		}		
	})
}
_COMMON.prototype.getRate=function(itemObj){//返回佣金
	var that=this;
	var itemurl=itemObj.itemurl;
	var url_pt="http://pub.alimama.com/items/search.json?q="+itemurl//普通
	var url_gy="http://pub.alimama.com/items/channel/qqhd.json?channel=qqhd&q="+itemurl//高佣金
	var yj={};
	return $.getJSON(url_pt)
	.then(function(json){
		yj.pt=json;
		itemObj.imgurl=itemObj.imgurl||(json.data&&json.data.pageList&&json.data.pageList[0].pictUrl);
		itemObj._bakimgurl=(json.data&&json.data.pageList&&json.data.pageList[0].pictUrl)||null;//备用图片地址
		if(itemObj.price==0){
			itemObj.price=(json.data&&json.data.pageList&&json.data.pageList[0].zkPrice)||0;
			itemObj.price=Number(itemObj.price)-Number(itemObj.coupon);
		}
		return $.getJSON(url_gy);
	})
	.then(function(json){
		yj.gy=json;
		itemObj.rate=yj;
		itemObj.pvid=json.info.pvid;
		return itemObj;
	})
	.then(function(itemObj){
		itemObj.yj=Number(itemObj.yj);
		var gy=itemObj.rate.gy.data.pageList?itemObj.rate.gy.data.pageList[0].eventRate:0;
		var pt=itemObj.rate.pt.data.pageList?itemObj.rate.pt.data.pageList[0].tkRate:0;	
		if(gy==0&&pt==0)
			return $.Deferred().reject({msg:"没有找到此商品",show:'alert'});
		if((gy>=itemObj.yj||pt>=itemObj.yj)&&itemObj>0)//如果普通佣金或鹊桥佣金大于等于网站显示的佣金则返回
			return itemObj;
		itemObj.rate.dx={};//否则申请定向计划
		return itemObj;
	})
}
_COMMON.prototype.getAuctionCode=function(itemObj){
	var _param={
		auctionid:itemObj.gid,
		adzoneid:itemObj.adzoneid,
		siteid:itemObj.siteid,
		t:new Date().getTime(),
		_tb_token_:itemObj._tb_token_
	};
	$.extend(_param,itemObj.rate.use.additional);
	return $.getJSON("http://pub.alimama.com/common/code/getAuctionCode.json",_param)
	.fail(function(){
		console.log("请登录阿里妈妈...");
		alert("请登录阿里妈妈...");
	})
	.then(function(json){
		itemObj.auctionCode=json;
		return itemObj;
	})
}
_COMMON.prototype.showCopyDialog=function(itemObj){//显示对话框
	var that=this;
	itemObj.redescribe=itemObj.describe.replace("AAcouponurlAA",itemObj.couponurl).replace("AAitemurlAA",itemObj.auctionCode.data.shortLinkUrl);
	if(itemObj.redescribe.indexOf(itemObj.auctionCode.data.shortLinkUrl)==-1){
		return $.Deferred().reject({msg:"网址替换失败!",show:'alert'});
	}
	if($("#btn_copy").length==0){
		$(document.body).append("<button style='display:none' id='btn_copy' data-clipboard-action='copy' data-clipboard-target='.copy-co'>复制</button>");
		var clipboard = new Clipboard('#btn_copy');
		clipboard.on('success', function(e) {
			console.log("复制成功 "+e);
		});
		clipboard.on('error', function(e) {
			console.log("复制失败 "+e);
		});
	}
	var imgurl=itemObj.imgurl.indexOf("127.0.0.1")!=-1?itemObj.imgurl:'http://127.0.0.1:63631/?action=getimg&imgurl='+itemObj.imgurl+"&";
	var html='<div>\
				<div contentEditable="true">\
					<div role="copy" class="copy-co" style="overflow:auto;height:600px">\
						<img style="max-width:375px;max-height:375px" src="'+imgurl+'&"></img>\
						<p>'+itemObj.redescribe+'</p>\
						'+(itemObj.setup_tail||'')+'\
					</div>\
				</div>\
				<br>\
				<p style="border-bottom: 1px solid #f1f1f1;font-weight: bold;"><a href="http://pub.alimama.com/promo/search/index.htm?q='+encodeURIComponent(itemObj.itemurl)+'" target="_blank">查看定向计划</a></p>\
				<p><b><span style="color:red">'+that.ratetype[itemObj.rate.use.type]+'</span>佣金:<span style="color:red">'+itemObj.rate.use.rate+'%</span>,成交可提成:<span style="color:red">'+(itemObj.rate.use.type=='gy'?itemObj.rate.use.rate*itemObj.price/100*0.85:itemObj.rate.use.rate*itemObj.price/100).toFixed(2)+'元</span></b></p>\
			</div>\
	';
	$.Zebra_Dialog(html,{
		'title': itemObj.title,
		type:itemObj.rate.use.rate<=10?"error":(itemObj.rate.use.rate<itemObj.yj?"warning":"information"),
		width:600,
		    'buttons':  [
				{caption: '保存', callback: function() {that.sendToBackground({action:'item_put',val:itemObj}).then(function(re){console.log(re)});return false;}},
				{caption: '复制', callback: function() { $("#btn_copy").click();return false;}},
				{caption: '关闭', callback: function() { return true;}}
            ]
	});
	$(".copy-co img").error(function(){//图片挂了，使用备用图片
		console.log("图片已挂，使用备用图片...");
		if(itemObj._bakimgurl)
			this.src='http://127.0.0.1:63631/?action=getimg&imgurl='+itemObj._bakimgurl+"&";
		$("#btn_copy").click();
	});
	$("#btn_copy").click();
	return itemObj;
}
_COMMON.prototype.sendtoqq=function(itemObj){
	var rndTime=new Date().getTime();
	return $.get("http://127.0.0.1:63630/?action=clearClipbrd&t="+rndTime)
	.then(function(re){
		if(re=="ok"){
			$("#btn_copy").click();
			return $.get("http://127.0.0.1:63630/?action=sendToQQ&beforpastedelay="+(500)+"&afterpastedelay="+(500)+"&t="+rndTime)
		}
		else
			return re;
	})
	.then(function(re){
		if(re=="reCopy"){
			$("#btn_copy").click();
			return $.get("http://127.0.0.1:63630/?action=sendToQQ&beforpastedelay="+(500)+"&afterpastedelay="+(500)+"&t="+rndTime)							
		}else
			return re;
	})
	.then(function(re){
		if(re=="ok"){
			console.log("QQ消息发送成功!");
			itemObj._sendqqtime=new Date().getTime();
			return itemObj;
		}
		else{
			return $.Deferred().reject(re);
		}
	})
	.fail(function(msg){
		console.error(msg);
	});

};
function tuiguang(itemObj){
	var _def = $.Deferred();
	return common.getToken(itemObj)
	.then(function(itemObj){
		if(!itemObj.adzoneid||!itemObj.siteid||!itemObj._tb_token_){//校验参数
			alert("参数不完整，请补全参数");
			_def.reject({msg:"参数不完整...",show:'console'});
			return _def;
		}
		else if(!itemObj.itemurl||itemObj.itemurl.indexOf("http")==-1){
			_def.reject({msg:"没有匹配到网址"});
			return _def.promise();
		}
		else{
			return itemObj;
		}
	})
	.then(common.checkValidity_coupon)//检查优惠卷有效性
	.then(common.getRate)//获得佣金
	.then(common.getCommonCampaign)//定向列表
	.then(common.applyForCommonCampaign)//申请
	.then(common.getCommonCampaign)//定向列表
	.then(common.applyForCommonCampaign)//校验申请
	.then(function(itemObj){
		return common.isinDxlist(itemObj);//检查有没有在定向列表中
	})
	.then(function(itemObj){//分析佣金
		itemObj.rate.use={};
		var gy=itemObj.rate.gy.data.pageList?itemObj.rate.gy.data.pageList[0].eventRate:0;
		var pt=itemObj.rate.pt.data.pageList?itemObj.rate.pt.data.pageList[0].tkRate:0;
		var dx=itemObj.rate.dx&&itemObj.rate.dx.use&&itemObj.rate.dx.use.ExistStatus==2?itemObj.rate.dx.use.commissionRate:0;
		console.log("定向佣金"+dx+",普通佣金:"+pt+",鹊桥佣金:"+gy);
		if(dx>=gy&&dx>=pt){//定向
			itemObj.rate.use={
				type:"dx",
				rate:dx,
				additional:{pvid:"",_input_charset:'utf-8'}
			}		
		}
		else if(gy>pt){//鹊桥
			itemObj.rate.use={
				type:"gy",
				rate:gy,
				additional:{pvid:itemObj.rate.gy.info.pvid,channel:'tk_qqhd',scenes:3}
			}
		}
		else if(pt>0){//普通佣金高
			itemObj.rate.use={
				type:"pt",
				rate:pt,
				additional:{pvid:itemObj.rate.pt.info.pvid,scenes:1}
			}				
		}
		else{
			itemObj.rate.use.rate=0;//没有找到数据
			_def.reject({msg:"没有找到此商品...",show:'console'});
			return _def;
		}
		return itemObj;
	})
	.then(function(itemObj){//返回淘客推广链接
		return itemObj.rate.use.rate>0?common.getAuctionCode(itemObj):itemObj;
	})
	.then(function(itemObj){//生成HTML,并显示对话框
		if(!itemObj.auctionCode)
			return itemObj;
		return common.showCopyDialog(itemObj);
	})
	.then(function(itemObj){
		console.log(itemObj);
		return itemObj;
	})
	.fail(function(msg){
		if(msg.show=='alert')
			alert(msg.msg);
		console.log(msg);
	});
}
function check_collection(msg){//别人QQ群消息提取
	var _def=$.Deferred();
	var itemObj={};
	var $contentEditable;
	console.clear();
	if(msg){
		$contentEditable=$("<div>"+msg+"</div>");
	}
	else
		$contentEditable=$(".contentEditable");
	if($contentEditable.length==0){
		_def.reject({msg:"消息为空"});
		return _def.promise();	
	}
	var imgurl=$contentEditable.find("img:first").attr("src");
	if(imgurl&&imgurl.substr(0,4)=="file"){
		imgurl=unescape(imgurl);
		imgurl=imgurl.replace(" ","fucktx");
		imgurl="http://127.0.0.1:63631/?action=localimg&imgurl="+imgurl+"&";
		$contentEditable.find("img:first").attr("src",imgurl).css({"width":"250px","height":"250px"});
		itemObj.imgurl=imgurl;
	}
	var text=$contentEditable.text();
	var reg=/(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/gm;
	var arr=text.match(reg);
	itemObj.couponurl=(arr&&arr.length==3&&arr[0])||(arr&&arr.length==2&&arr[0])||"";//提取优惠券地址
	itemObj.itemurl=(arr&&arr.length==3&&arr[2])||(arr&&arr.length==2&&arr[1])||(arr&&arr.length==1&&arr[0])||"";//提取购买地址
	if(!itemObj.itemurl||itemObj.itemurl.indexOf("http")==-1){
		_def.reject({msg:"没有匹配到网址"});
		return _def.promise();
	};
	var reg=/后[^\d]*(\d*\.\d*|\d*)元/;
	var arr=text.match(reg);
	itemObj.price=Number((arr&&arr.length==2&&arr[1])||0);//提取单价
	var titlereg=/(.*?)http/;
	var arr=text.match(titlereg);
	itemObj.title=((arr&&arr.length==2&&arr[1])||"");//提取标题
	$contentEditable.find("img").remove();
	itemObj.describe=$contentEditable.html().replace(itemObj.itemurl,"AAitemurlAA").replace(itemObj.couponurl,"AAcouponurlAA").replace("<br><br>","").replace(/更多内部优惠券.*/g,"");
	console.log("正在打开淘宝页查询%s真实地址...",itemObj.itemurl);
	itemObj._trycount=0;
	getRealurl(itemObj)
	.then(function(itemObj){
		_def.resolve(itemObj);
	})
	.fail(function(msg){
		if(msg.show=='alert')
			alert(msg.msg);
		console.log(msg);	
		_def.reject(msg);
	});
	return _def.promise();
}
function getRealurl(itemObj){
	var _def=$.Deferred();
	common.sendToBackground({"action":"createTab",data:{url:itemObj.itemurl,active: false}})
	.then(function(tab){
		var timer=setInterval(function(){
			itemObj._trycount++;
			console.log("等待淘宝页响应%d秒...",itemObj._trycount);
			console.log(tab);
			common.sendToBackground({"action":"tabs_query",data:{index:tab.index}})
			.then(function(tabs){
				console.log(tabs[0].url);
				if(!(tabs instanceof Array)){
					clearInterval(timer);
					console.error("后台返回失败...");
					return _def.reject("后台返回失败...");
				}
				if(tabs[0].url.indexOf("item.htm?id=")!=-1){
					clearInterval(timer);
					itemObj.yj=0;
					itemObj.itemurl=/http.+?id=\d+/.exec(tabs[0].url)[0]||"";
					console.log("得到真实链接%s",itemObj.itemurl);
					itemObj.gid=/[\?|&]id=(\d+)/.exec(itemObj.itemurl)[1]||"";//商品ID
					console.log("得到商品ID%s",itemObj.gid);
					common.sendToBackground({"action":"tabs_remove",id:tabs[0].id});//关闭标签页
					_def.resolve(itemObj);
				}
				else if(tabs instanceof Array&&tabs[0].url.indexOf("error")!=-1){
					clearInterval(timer);
					_def.reject("网页失效...");
					console.error("%s网页失效...",tabs[0].url);
					common.sendToBackground({"action":"tabs_remove",id:tabs[0].id});//关闭标签页
				}
			})
			if(itemObj._trycount%30==0){
				console.log("长时间没响应，刷新页面...");
				common.sendToBackground({"action":"tabs_reload",id:tab.id});//重读标签页
			}
			if(itemObj._trycount%60==0){
				clearInterval(timer);
				_def.reject("淘宝页面长时间无响应...");
				console.error("淘宝页面长时间无响应...");
				common.sendToBackground({"action":"tabs_remove",id:tab.id});//关闭标签页
			}
		},1000)
	})
	return _def.promise();
}