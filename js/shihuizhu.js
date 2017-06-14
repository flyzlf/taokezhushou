console.log("hello,im shihuizhu.js");
var common=new _COMMON();
var _SHIHUIZHU=function(){
	var that=this;
	this.itemlist=[];
	this.itemlistIndex={};//索引
	this.URLlist={
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
		for(var i=1;i<threadcount;i++){//启动多线程
			if(that.URLlist.list.length<threadcount)break;
			console.log("线程"+i+"启动...");
			that._makeitemlist(that.URLlist.getNext(),Analysis,callback);
		}
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
	};	
	this._Analysis=function(param){//分析get回来的html,提取商品信息
		var _item;
		if(param.html=="thispage")
			_item=$(".show-goods-list");
		else
			_item=$(param.html).find(".show-goods-list");
		if(_item.length==0){
			console.log("从"+param.url+"得到商品列表失败!");
			return;
		}
		$.each(_item,function(i,v){
			var ele=$(v);
			var data=this.___Analysis(ele);
			this.itemlistIndex[data.gid]=this.itemlist.push(data)-1;
		}.bind(that));	
	};
	this.___Analysis=function(ele){
		console.log(ele);
		var data={};
		data.srcurl=ele.find(".goods-pic a").attr("href");
		if(data.srcurl.indexOf("shihuizhu.com")==-1)data.srcurl="http://www.shihuizhu.com"+ele.find(".goods-pic a").attr("href");//实惠猪商品ID页
		data.title=$.trim(ele.find(".goods-pic a").attr("title"));//商品标题
		data.gid=ele.find(".choose,.addcar").attr("data-gid");//商品ID
		data.price=ele.find(".goods-price p:eq(0)").text().replace("￥","");//券后单价
		data.imgurl=ele.find(".goods-pic img").attr("src");//图片地址
		data.yj=ele.find(".goods-price p:eq(1)").text().replace(/[佣金\：\%]/g,"");//佣金
		data.coupondenomination=ele.find(".goods-quan-left .c2").text().replace(" 元","");//优惠券面额
		data.coupondenomination=data.coupondenomination.indexOf("天")==-1?data.coupondenomination:0;
		data.sellcount=ele.find(".goods-quan-mid .c9").text();//总销量
		data.sitetype=ele.find(".goods-quan-right .tag-tm").length==0?"taobao":"tmall";//淘宝还是天猫	
		data.describe=ele.find(".intro div").html();//文案
		console.log(data);
		return data;
		
	}
	this._AnalysisWenan=function(itemObj){//分析文案页
		/*
		var div=$(param.html).find("#clipboard");
		if(div.length==0){
			console.log("从"+param.url+"得到推广文案失败!");
			return;
		}
		//var itemImg=div.find("img").attr("src");
		var tmp={};
		tmp.itemurl=div.find("a[biz-itemid]").after("AAitemurlAA").text();//淘宝地址
		if(!tmp.itemurl)
			tmp.itemurl=div.find("a:last").after("AAitemurlAA").text();//淘宝地址
		var gid=/[\?|&]id=(\d+)/.exec(tmp.itemurl);//商品ID
		gid=(gid&&gid[1])||0;
		if(gid==0)
			return $.Deferred().reject({msg:"没有匹配到购买地址!"});
		if(div.find("a").length==2)
			tmp.couponurl=div.find("a:first").after("AAcouponurlAA").attr("href");//优惠券地址
		div.find("img,a").remove();
		tmp.describe=div.html().replace(/\s/g,"");//文案
		var _idx=that.itemlistIndex[gid]
		$.extend(that.itemlist[_idx],tmp);
		return tmp;
		*/
		var reg=/(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/gm;
		var arr=itemObj.describe.match(reg);
		itemObj.couponurl=(arr&&arr.length==3&&arr[0])||(arr&&arr.length==2&&arr[0])||"";//提取优惠券地址
		itemObj.itemurl=(arr&&arr.length==3&&arr[2])||(arr&&arr.length==2&&arr[1])||(arr&&arr.length==1&&arr[0])||"";//提取购买地址
		itemObj.describe=itemObj.describe.replace(itemObj.couponurl,"AAcouponurlAA").replace(itemObj.itemurl,"AAitemurlAA");
		return itemObj;
	}
	this.getItemObj=function(obj){
		if(obj.isLocal)//本地数据直接返回
			return obj;
		return that._AnalysisWenan(obj);
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
								<em style="height: 40px;border: none;padding: 20px;"  class="-msger">准备完毕</em>\
							</div>\
						</div>\
					</div>\
				</div>\
			</div>'
		$(document.body).append(html);
		$(".-sendRecordListclear").click(function(){
			common.sendRecordList_server.clear();
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
			common.sendRecordList_server.exist(_itemObj.gid)
			.then(function(exist){
				if(exist){
					console.log("%s发过了...",_itemObj.title);
					return $.Deferred().reject("发过了...");	
				}
				else
					return that.getItemObj(_itemObj);
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
				common.sendRecordList_server.put(itemObj.gid);//保存发送记录
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
var shihuizhu=new _SHIHUIZHU();
$(function(){
	shihuizhu.createTopNav();//创建导航条
	$(".goods-list-box").click(function(e){//推广
		console.log(e.target.className);
		if(e.target&&(e.target.className.indexOf("goods-bottom-btn")!=-1)){
			e.preventDefault();
			e.stopPropagation();
			var div=$(e.target).parent().parent();
			console.clear();
			//获得ITEM所有参数
			tuiguang(shihuizhu.getItemObj(shihuizhu.___Analysis(div)))
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
	});
})

function convertImgToBase64(url, callback, outputFormat){
    var canvas = document.createElement('CANVAS'),
        ctx = canvas.getContext('2d'),
        img = new Image;
    img.crossOrigin = 'Anonymous';
    img.onload = function(){
        canvas.height = img.height;
        canvas.width = img.width;
        ctx.drawImage(img,0,0);
        var dataURL = canvas.toDataURL(outputFormat || 'image/png');
        callback.call(this, dataURL);
        canvas = null; 
    };
    img.src = url;
}