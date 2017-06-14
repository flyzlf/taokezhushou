console.log("hello,im dataoke_new.js");
var common=new _COMMON();
var _TAOKEZHUSHOU=function(){
	var that=this;
	this.href="http://www.dataoke.com";
	this.itemlist=[];
	this.itemlistIndex={};//索引
	this.URLlist={
		finish:0,
		list:[],
		point:0,
		clean:function(){
			this.point=0;
			this.list=[];
		},
		getNext:function(){
			return this.point>=this.list.length?null:this.list[this.point++];
		},
		make:function(_url,_from,_to){
			var _arr=[];
			for(var i=_from;i<=_to;i++)
				_arr.push(i);
			this._make(_url,_arr);
		},
		_make:function(_url,_arr){
			$.each(_arr,function(i,v){
				var url=_url.replace(/\?\?/g,v);
				this.list.push(url);
			}.bind(this));
		}
	};
	this.makeitemlist=function(threadcount){
		threadcount=threadcount||1;
		this._makeitemlist(this.URLlist.getNext(),this._Analysis,function(){
			console.log("列表页完毕!!");
			that.URLlist.clean();
			$.each(that.itemlist,function(i,v){
				//console.log(v.srcurl);
				v.srcurl&&that.URLlist.list.push(v.srcurl);
			}.bind(that),threadcount);
			that._makeitemlist(that.URLlist.getNext(),that._AnalysisWenan,function(){
				console.log("方案页完毕!!");
			},threadcount);
		},threadcount);
	};
	this._makeitemlist=function(url,Analysis,callback,threadcount){
		threadcount=threadcount||1;
		url=url||this.URLlist.getNext();
		if(!url){
			console.log("本线程完毕!!");
			if(that.URLlist.finish>=that.URLlist.list.length){//全部完成
				console.log("全部线程完毕!!");
				callback&&callback(this.itemlist);
			}
			return;
		}
		console.log(this.URLlist.point+'/'+this.URLlist.list.length+"正在请求"+url+"...");
		$.get(url,function(re){
			Analysis({html:re,url:url});
		}.bind(this))
		.done(function(){that.URLlist.finish++;this._makeitemlist(this.URLlist.getNext(),Analysis,callback)}.bind(this))//一个一个请求
		.fail(function(){that.URLlist.finish++;console.log("出错了"+url+"...");this._makeitemlist(this.URLlist.getNext(),Analysis,callback)}.bind(this));
		for(var i=1;i<threadcount;i++){//启动多线程
			if(that.URLlist.list.length<threadcount)break;
			that._makeitemlist(that.URLlist.getNext(),Analysis,callback);
		}
	};	
	this._Analysis=function(param){//分析get回来的html,提取商品信息
		var that=this;
		var _item
		if(param.html=="thispage"){
			_item=$(".goods-item-content");
		}
		else
			_item=$(param.html).find(".quan_list .quan_goods");
		var ret=[];
		if(_item.length==0){
			console.log("从"+param.url+"得到商品列表失败!");
			return;
		}
		$.each(_item,function(i,v){
			var ele=$(v);
			var data=that.___Analysis(ele);
			this.itemlistIndex[data.srcurl]=this.itemlist.push(data)-1;
			ret.push(data);
		}.bind(that));
		return ret;
	};
	this.___Analysis=function(ele){
		var data={};
		data.srcurl=ele.find(".goods-img a:first").attr("href");//商品ID页
		data.gid=ele.parent().attr("data_goodsid");
		data.title=$.trim(ele.find(".goods-tit").text());//商品标题
		data.price=ele.find(".goods-price b").text().replace("￥","");//券后单价
		//data.imgurl=ele.find("img").attr("data-original");//图片地址
		data.yj=$.trim(ele.find(".goods-yj p").text()).replace("%","");//佣金
		data.coupondenomination=ele.find(".goods-quan b").text().replace("￥","");//优惠券面额
		//data.coupondenomination=data.coupondenomination.indexOf("天")==-1?data.coupondenomination:0;
		data.sellcount=ele.find(".goods-sale span b").text();//总销量
		data.sitetype=ele.find(".tag").find(".tag-tmall").size()==0?"taobao":"tmall";//淘宝还是天猫
		return data;
	}
	this._AnalysisWenan=function(param){//分析文案页
		var $html=$(param.html);
		var div=$html.find(".qq-tui-main .tui-content");
		console.log(div.html());
		if(div.length==0){
			console.log("从"+param.url+"得到推广文案失败!");
			return;
		}
		//var itemImg=div.find("img").attr("src");
		var tmp={};
		tmp.itemurl=$html.find(".goods-big-img a").attr("href");//淘宝地址
		//var gid=div.find("a[biz-itemid]").attr("biz-itemid");
		tmp.couponurl=$html.find(".yong-quan-comment .quan a").attr("href");//优惠券地址
		tmp.imgurl=$html.find(".goods-big-img img").attr("src");//图片地址
		tmp.gid=/[\?|&]id=(\d+)/.exec(tmp.itemurl)[1];;//商品ID
		//div.find("span").remove().after("领券地址:AAcouponurlAA<br>下单地址:AAitemurlAA");
		//div.find("img,a").remove();
		//div.find("div[style='display:none']").remove();
		//tmp.describe=div.html().replace(/\s/g,"").replace(/style=".*?"/g,"").replace("猪猪群","");//文案
		var _idx=that.itemlistIndex[param.url]
		$.extend(that.itemlist[_idx],tmp);
		return tmp;
	};
	this._getHtml=function(url){
		return $.get(url);
	};
	this.getItemObj=function(obj){
		if(obj.isLocal)
			return obj;
		return $.post("http://www.dataoke.com/detailtpl",{gid:/[\?|&]id=(\d+)/.exec(obj.srcurl)[1]},"json")
		.then(function(json){
			obj.describe=json.data.tpl1;
			console.log(obj.describe);
			obj.describe=obj.describe.replace("领券下单链接<span>[请转换QQ二合一]</span>","领券地址:AAcouponurlAA<br>下单地址:AAitemurlAA");
			obj.describe=obj.describe.replace(/\<img.*?br\>/g,"");
			console.log("请求"+obj.srcurl);
			return $.get(obj.srcurl);
		})
		.then(function(re){
			return that._AnalysisWenan({html:re,url:obj.srcurl})
		})
		.then(function(wenandata){
			return $.extend({},obj,wenandata);
		})
	};
	this.createTopNav=function(){//创建导航条
		var html='\
			<div class="navbar-1" style="position: fixed;right: 0;left: 0;top:0;z-index: 1030;background-color: #bce8f1;height:42px">\
				<div class="panel panel-info" style="border-color: #bce8f1;">\
					<div class="panel-heading_1 ">\
						<div class="btn-toolbar_1">\
							<div >\
								<button type="button" style="height: 40px;background: #009f95;border: none;padding: 10px;color: white;" class="-autosendthispage">自动发本页</button>\
								<button type="button" style="height: 40px;background: #d9534f;border: none;padding: 10px;color: white;"  class="-autosendstop">停止发送</button>\
								<button type="button" style="height: 40px;background: #009f95;border: none;padding: 10px;color: white;"  class="-sendRecordListclear">清空发送记录</button>\
								<span class="input-group-addon" style="font-weight: bold;">发送间隔秒:</span>\
								<input type="text" style="width:60px" class="form-control -senddalay" placeholder="发送间隔" aria-describedby="basic-addon1" value="60" >\
								<em style="height: 40px;border: none;padding: 20px;"  class="-msger">准备完毕new</em>\
							</div>\
						</div>\
					</div>\
				</div>\
			</div>'
		$(document.body).append(html);
		$(".-sendRecordListclear").click(function(){
			common.sendRecordList_server.clear();
			common.sendRecordList.clear();
			console.log("发送记录已清空!");
			$(".-msger").text("发送记录已清空!");
		});
		$(".-autosendthispage").click(function(){
			that.autosendThisPage();
		});
		$(".-autosendstop").click(function(){
		    clearTimeout(that.autosendtimer);
			that.autosendstop=true;
			console.log("手动停止!");
			$(".-msger").text("已停止");
		})
	}
	this.getautosendparam=function(){
		var senddalay=Number($(".-senddalay").val()||10);
		return {senddalay:senddalay};
	};
	this.autosendThisPage=function(){
		that.autosendstop=false;
		console.log("生成列表中...");
		$(".-msger").text("生成列表中");
		that.itemlist=[];
		clearTimeout(that.autosendtimer);
		this._Analysis({html:'thispage',url:location.href});//生成本页列表
		var point=0;
		var getnext=function(){
			$(".-msger").text("共"+that.itemlist.length+"个,现在是第"+(point+1)+"个");
			console.log("共%d个,现在是第%d个...",that.itemlist.length,point+1);
			return point>=that.itemlist.length?null:that.itemlist[point++];
		}
		var func=function(){
			if(that.autosendstop){
				console.log("手动停止!");
				return;
			}
			var _itemObj=getnext();
			if(!_itemObj){
				console.log("全部发送完毕!");
				$(".-msger").text("全部发送完毕");
				return true;
			}
			if(common.sendRecordList.exist(_itemObj.srcurl)){
				console.log("%s发过了...",_itemObj.title);
				func();
				return;
			}
			that.getItemObj(_itemObj)
			.then(function(itemObj){
				var _def = $.Deferred();
				_itemObj=itemObj;
				common.sendRecordList_server.exist(itemObj.gid)
				.then(function(exist){
					if(exist){
						console.log("%s发过了...",_itemObj.title);
						_def.reject("发过了...");	
					}
					else
						_def.resolve(itemObj);
				})
				return _def.promise();
			})
			.then(tuiguang)
			.then(function(itemObj){
				if(itemObj.setup_yjfloorlimit<itemObj.rate.use.rate)
					return common.sendtoqq(itemObj);
				else{
					console.log("佣金太低,不发QQ...");
					return itemObj;
				}				
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
			})
			.then(function(itemObj){
				$(".ZebraDialog_Close").click();
				console.log("%s发送成功,%d秒后发送下一个...",itemObj.title,that.getautosendparam().senddalay);
				common.sendRecordList_server.put(_itemObj.gid);//保存发送记录
				common.sendRecordList.put(_itemObj.srcurl);//保存发送记录
				that.autosendtimer=setTimeout(func,that.getautosendparam().senddalay*1000);//成功后定时
			},function(err){
				console.log(err);
				if(err.msg=="请登录阿里妈妈"||err.msg=='参数不完整...')
					return err;
				$(".ZebraDialog_Close").click();
				if(err=="stop")
					return err;
				err=="发过了..."?null:common.sendRecordList_server.put(_itemObj.gid);//保存发送记录
				func();//失败了直接下一个
			});
		}//end func;
		func();
	}//end autosendThisPage
};
var taokezhushou=new _TAOKEZHUSHOU();
$(function(){
	taokezhushou.createTopNav();
    $(".goods-pages").css("z-index","1");
	$(".goods-img").before("<a href='#' class='explan' style='height:35px;width:225px;font-size: 20px;color:#fff;padding:2px;margin-top:195px;z-index:8;position: absolute;background-color:#ff4400'>推广该商品</a>");
	$(".explan").click(function(e){
		e.preventDefault();
		var div=$(this).parent();
		console.clear();
		taokezhushou.getItemObj(taokezhushou.___Analysis(div))//获得ITEM所有参数
		.then(tuiguang)
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
	})
})