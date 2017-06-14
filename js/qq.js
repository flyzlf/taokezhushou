console.log("hello,i'm qq.js!");
common=new _COMMON();
glb={};
glb.titles={};
glb.sendlist={};
glb.issendok=true;
$(function(){
	setInterval(getnewmsg,1000);
})
function getnewmsg(){
	var msgwindowtitle=$("#panelTitle-5").text();
	if(!msgwindowtitle)return;
	glb.titles[msgwindowtitle]=glb.titles[msgwindowtitle]||{};
	glb.titles[msgwindowtitle].point=glb.titles[msgwindowtitle].point||0;
	var $content_groups=$(".chat_content_group");
	if(glb.titles[msgwindowtitle].point>=$content_groups.length||!glb.issendok)return;
	var newmsg=$($content_groups[glb.titles[msgwindowtitle].point++]).find(".chat_content").text();
	console.log(msgwindowtitle);
	glb.issendok=false;
	check_collection(newmsg)
	.then(function(itemObj){
		if(glb.sendlist[itemObj.gid]){
			console.log("该商品已经在%s发过了...",glb.sendlist[itemObj.gid]);
			return $.Deferred().reject("该商品已经发过了...");
		}
		return itemObj;
	})
	.then(tuiguang)
	.then(function(itemObj){
		if(itemObj.rate.use.rate<10){
			return $.Deferred().reject("商品佣金比例只有"+itemObj.rate.use.rate+",不推广");
		}
		return itemObj;
	})
	.then(function(itemObj){
		glb.sendlist[itemObj.gid]=common.getDateTime("yyyy-MM-dd hh:mm:ss");
		console.log("生成成功!开始发送QQ消息...");
		return common.sendtoqq(itemObj);
	})
	.then(common.saveItemObjToback)//保存
	.then(function(itemObj){
		console.log("发送成功!");
		glb.issendok=true;
		$(".ZebraDialog_Close").click();
	},function(err){console.error("出错了...");console.log(err);glb.issendok=true;$(".ZebraDialog_Close").click();})
}