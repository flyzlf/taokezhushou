$(function(){
	var _info={
		adzoneid:'',
		siteid:'',
		_tb_token_:''	
	}
	sendToBackground({action:'getData',data:_info})
	.then(function(info){
		$.each(info,function(i,v){
			$("."+i).val(v);
		})
	});
	$.getJSON("http://pub.alimama.com/common/getUnionPubContextInfo.json")
	.then(function(json){
		if(json.data.noLogin){//没有登录
			$(".btn-login-").removeClass("hide").attr("url",json.data.loginUrlPrefix);
		}
		else{
			json.data.avatar=json.data.avatar.indexOf("http")==-1?"http:"+json.data.avatar:json.data.avatar;
			$info=$("#info");
			$info.find(".avatar").attr('src',json.data.avatar);
			$info.find(".mmNick").val(json.data.mmNick);
			$info.find(".memberid").val(json.data.memberid);
		}
	});
	$(".btn-login-").click(function(){//登录按钮
		var tabid=localStorage.getItem("alimama_tabid")||null;
		if(tabid) 
			sendToBackground({"action":"tabs_remove",id:Number(tabid)})//关闭标签页
		chrome.tabs.create({url:$(this).attr("url")},function(tab){
			localStorage.setItem("alimama_tabid",tab.id);
		});	
	});
	$(".btn-save-").click(function(){//保存按钮
		localStorage.setItem("adzoneid",$(".adzoneid").val());
		localStorage.setItem("siteid",$(".siteid").val());
	});
	$(".btn-locallist-").click(function(){
		var tabid=localStorage.getItem("locallist_tabid")||null;
		if(tabid)
			sendToBackground({"action":"tabs_remove",id:Number(tabid)})//关闭标签页
		chrome.tabs.create({url:"itemList.htm"},function(tab){
			localStorage.setItem("locallist_tabid",tab.id);
		})
	})
})
sendToBackground=function(msg){//向后台发消息,promiss写法
	var def = $.Deferred();
	chrome.runtime.sendMessage(msg, function(response){
		def.resolve(response);
	});
	return def;
};