common=new _COMMON();
$(function(){
	makeitemlist.getdata();
	$(".-loadmore").click(function(){
		makeitemlist.makeItem()=="empty"?$(this).text("木有更多了"):null;
	})
	$("#itemlist .row").click(function(e){
		e.preventDefault();
		var a=$(e.target);
		var div=a.parent().parent().parent();
		if(a.attr("role")=="btn_tuiguang"){
			console.log("推广"+div.attr("gid"));
			tuiguang(div.data("itemObj"))
			.then(function(itemObj){
				if(itemObj.setup_isautosendqq){
					if(itemObj.setup_yjfloorlimit==0||itemObj.setup_yjfloorlimit<itemObj.rate.use.rate)
						return common.sendtoqq(itemObj);
					else{
						console.log("佣金太低,不发QQ...");
						return itemObj;
					}
				}
				return itemObj;
			})
			.then(function(itemObj){
				if(itemObj.setup_isautosave){
					console.log("保存到本地列表...");
					return common.saveItemObjToback(itemObj)
					.then(function(itemObj){
						console.log("done...");
						return itemObj;
					});
				}	
				return itemObj;
			});
		}
		else if(a.attr("role")=="btn_delete"){
			var gid=div.attr("gid");
			$.Zebra_Dialog("确定要删除此商品吗?",{
				'title': "确认一下",
				type:"warning",
					'buttons':  [
						{caption: '是的', callback: function() {sendToBackground({action:'item_delete',key:gid}).then(function(){div.remove();});}},
						{caption: '不要', callback: function() {}}
					]
			});
		}
		else if(a.attr("role")=="btn_show"){//查看
			var itemObj=div.data("itemObj");
			common.showCopyDialog(itemObj);
			console.log(itemObj);
		}
	})
	$(".btn.-add").click(function(){
		var html='	<div style="height:600px" class="contentEditable" contentEditable="true">\
					</div>'
		$.Zebra_Dialog(html,{
			'title': '添加内容',
			type:false,
			width:600,
				'buttons':  [
					{caption: '校验', callback: function() {
						check_collection()
						.then(tuiguang)
						.then(common.saveItemObjToback)//保存
						.then(function(itemObj){
							makeitemlist.makeItem([itemObj],0,1);
						})
					}},
					{caption: '保存', callback: function() {return false;}},
					{caption: '关闭', callback: function() { return true;}}
				]
		});	
	});
	$(".btn.-refresh").click(function(){
		makeitemlist();
	});
	$(".btn.-setup").click(function(){
		setup();
	});
	$(".btn.-deleteAll").click(function(){
		$.Zebra_Dialog("确定要清空整个列表吗?",{
				'title': "确认一下",
				type:"warning",
					'buttons':  [
						{caption: '是的', callback: function() {sendToBackground({action:'item_delete',key:null}).then(function(){makeitemlist.getdata();});}},
						{caption: '不要', callback: function() {}}
					]
		});
	});
})
sendToBackground=function(msg){//向后台发消息,promiss写法
	var def = $.Deferred();
	chrome.runtime.sendMessage(msg, function(response){
		def.resolve(response);
	});
	return def;
};
function setup(){
	var html='\
		<div>\
			<div class="panel panel-info">\
			  <div class="panel-heading">消息尾巴</div>\
			  <div class="panel-body" style="padding:3px;">\
				<div contentEditable="true" style="height:100px;padding:3px;" class="setup_tail">{消息尾巴}</div>\
			  </div>\
			</div>\
			<div class="panel panel-info">\
			  <div class="panel-heading">自动发送相关</div>\
			  <div class="panel-body" style="padding:3px;">\
			  	<div>\
					<span>佣金下限:</span><input style="width:25px; margin-right: 10px;" type="text" class="setup_yjfloorlimit" placeholder="佣金下限" value="{佣金下限}">\
					<span>发送记录时限:</span><input style="width:25px; margin-right: 10px;" type="text" class="setup_sendlisttimeout" placeholder="发送记录时限" value="{发送记录时限}">\
					<span>粘贴后延迟:</span><input style="width:25px; margin-right: 10px;" type="text" class="setup_afterpastedelay" placeholder="粘贴后延迟" value="{粘贴后延迟}">\
					<span>自动发QQ</span><input style="margin-right: 10px;" class="setup_isautosendqq" type="checkbox" {自动发QQ}>\
					<span>自动保存</span><input type="checkbox" class="setup_isautosave" {自动保存}>\
				</div>\
			  </div>\
			</div>\
			<div class="panel panel-info">\
			  <div class="panel-heading">阿里妈妈登录设置</div>\
			  <div class="panel-body" style="padding:3px;">\
			  	<div>\
					<span>用户名:</span><input style="width:150px; margin-right: 10px;" type="text" class="setup_alimamauser" placeholder="阿里妈妈用户名" value="{阿里妈妈用户名}">\
					<span>密码:</span><input style="width:150px; margin-right: 10px;" type="password" class="setup_alimamapassword" placeholder="阿里妈妈密码" value="{阿里妈妈密码}">\
					<span>自动登录</span><input type="checkbox" class="setup_isautologin" {自动登录}>\
				</div>\
			  </div>\
			</div>\
		</div>\
	';
	return sendToBackground({action:"getData",data:{setup_tail:'',setup_isautosave:0,setup_isautosendqq:0,setup_yjfloorlimit:10,setup_sendlisttimeout:12,setup_alimamauser:'',setup_alimamapassword:'',setup_isautologin:0,setup_afterpastedelay:0.5}})
	.then(function(data){
		html=html.replace("{消息尾巴}",data.setup_tail)
		.replace("{佣金下限}",data.setup_yjfloorlimit)
		.replace("{发送记录时限}",data.setup_sendlisttimeout)
		.replace("{粘贴后延迟}",data.setup_afterpastedelay)
		.replace("{自动发QQ}",data.setup_isautosendqq?"checked":"")
		.replace("{自动保存}",data.setup_isautosave?"checked":"")
		.replace("{阿里妈妈用户名}",data.setup_alimamauser)
		.replace("{阿里妈妈密码}",data.setup_alimamapassword)
		.replace("{自动登录}",data.setup_isautologin?"checked":"");
		$.Zebra_Dialog(html,{
			'title': "设置",
			width:600,
			type:false,
				'buttons':  [
					{caption: '保存', callback: function() {
						return sendToBackground({action:"saveData",
							data:{
								setup_tail:$(".setup_tail").html(),
								setup_yjfloorlimit:$(".setup_yjfloorlimit").val(),
								setup_sendlisttimeout:$(".setup_sendlisttimeout").val(),
								setup_isautosendqq:$(".setup_isautosendqq").is(':checked')?1:0,
								setup_isautosave:$(".setup_isautosave").is(':checked')?1:0,
								setup_alimamauser:$(".setup_alimamauser").val(),
								setup_alimamapassword:$(".setup_alimamapassword").val(),
								setup_afterpastedelay:$(".setup_afterpastedelay").val(),
								setup_isautologin:$(".setup_isautologin").is(':checked')?1:0
							}
						})
						.then(function(re){console.log(re)});
					}},
					{caption: '放弃', callback: function() {}}
				]
		});	
	})
}
makeitemlist={
	pagelimit:20,
	point:0,
	data:[],
	makeItem:function(itemObjArr,s,e){
		var that=this;
		itemObjArr=itemObjArr||that.data;
		var html='\
		<div class="item" gid="#gid#">\
			<img class="lazy" src="#imgurl#">\
			<div class="caption">\
				<p class="itemlist-title">#title#</p>\
				<p>\
					<span class="itemlist-prise">￥<em>#_prise#</em></span>\
					<span class="itemlist-yjz">挣:￥<em>#_zyj#</em></span>\
					<span class="itemlist-yj">#_ratetype#:<em>#_yj#%</em></span>\
				</p>\
				<p>\
					<a href="#" class="btn btn-primary" role="btn_tuiguang">推广</a>\
					<a href="#" class="btn btn-info" role="btn_show">查看</a>\
					<a href="#" class="btn btn-warning" role="btn_delete">删除</a>\
				</p>\
			</div>\
		</div>';
		var $row=$("#itemlist .row");
		s=s||that.point;
		e=e||s+that.pagelimit;
		e=e>itemObjArr.length?itemObjArr.length:e;
		that.point=e;
		if(s>=e){
			return "empty";
		}
		for(i=s;i<e;i++){
			var v=itemObjArr[i];
			var _html=html;
			v._zyj=(v.rate.use.type=='gy'?v.rate.use.rate*v.price/100*0.85:v.rate.use.rate*v.price/100).toFixed(2);
			v._yj=v.rate.use.rate;
			v._prise=Number(v.price).toFixed(2);
			v._ratetype=common.ratetype[v.rate.use.type];
			v.imgurl=v.imgurl.indexOf("http")==-1?'http:'+v.imgurl:v.imgurl;
			$.each(v,function(ii,vv){
				_html=_html.replace("#"+ii+"#",vv);
			})
			$row.append(_html);
			$row.find(".item:last img:first").error(function(){//图片挂了，使用备用图片
				console.log("%s图片挂了，加载备用图片...",v.gid);
				if(v._bakimgurl)
					this.src=v._bakimgurl.indexOf("http")==-1?'http'+v._bakimgurl:v._bakimgurl;
			});
			$row.find(".item:last").data("itemObj",v);
		};
		$(".-loadmore").text("共有"+that.data.length+"条，已加载"+that.point+"条,点击加载更多...");
	},
	getdata:function(){
		var that=this;
		var $row=$("#itemlist .row");
		$row.empty();
		sendToBackground({action:'item_getLocalitemlist'})
		.then(function(data){
			if(data.err)
				return data.data;
			that.data=data.data;
			that.makeItem(data.data);
		})
	}
	
}
