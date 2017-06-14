console.log("hello,i'm tmalltaobao.js!");
var common=new _COMMON();
$(function(){
	var price=$(".tm-price:last").text();
	price=price||$(".tb-rmb-num:last").text();
	var reg=/\d*\.\d*/;
	var price_min=reg.exec(price)
	price_min=price_min&&price_min[0]||price;
	console.log(price_min);
	if(location.href.indexOf("login.taobao.com")>-1){//阿里妈妈登录
		common.sendToBackground({action:"getData",data:{setup_alimamauser:'',setup_alimamapassword:'',setup_isautologin:0}})
		.then(function(data){
			if(data.setup_isautologin){
				$("#TPL_username_1").val(data.setup_alimamauser);//自动填充用户名
				$("#TPL_password_1").val(data.setup_alimamapassword);//自动填充密码
			}
		})
	}
})