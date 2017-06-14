console.log("hello,im alimama.js");
var common=new _COMMON();
$(function(){
	var _tb_token_=common.getCookie("_tb_token_");
	common.saveDataToBack({_tb_token_:_tb_token_})
	.then(function(re){console.log(re)});
})
