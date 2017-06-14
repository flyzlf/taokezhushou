_ITEMLIST=function(){
	var that=this;
	this.initDB=function(){
		this.db=new _INDEXEDDB({db_name: "taoke", db_version: 1, db_store_name: "taoke_local"});
		return this.db.open()
		.then(function(){
			that.isdbopen=true;
		})
		.fail(function(re){
			console.log("打开数据失败");
			console.log(re);
		})
	}
	this.getLocalitemlist=function(key){
		var _def = $.Deferred();
		if(!this.isdbopen){
			_def.reject("数据库没有打开" ); 
			return _def.promise();
		}
		return this.db.select(key);
	}
	this.delete=function(key){
		return this.db.delete(key);
	}
	this.put=function(val,key){
		return this.db.put(val,key);
	};
	this.deleteAll=function(){
		return this.db.delete();
	}
}
_INDEXEDDB=function(params){
	var that=this;
	this.db_name = params.db_name;  
	this.db_version = params.db_version||'1.1';  
	this.db_store_name = params.db_store_name;  
	this.open=function(){
		var _def = $.Deferred();
		var request = indexedDB.open(this.db_name,this.db_version);  
		//打开数据失败  
		request.onerror = function(event)   
		{   
			_def.reject("不能打开数据库,错误代码: " + event.target.errorCode);  
		};  
		request.onupgradeneeded = function(event)   
		{  
			var db = event.target.result;   
			var t=db.createObjectStore(that.db_store_name,{keyPath: "gid"});  //创建表
			var titleIndex = t.createIndex("by_title", "title",{ unique: false });
		};  
		//打开数据库  
		request.onsuccess = function(event)   
		{  
			//此处采用异步通知. 在使用curd的时候请通过事件触发  
			that.db = event.target.result; 
			_def.resolve(that.db); 
		}; 
		return _def.promise();
	}
	this.put= function(val,key) 
    {  
        var _def = $.Deferred();
        var transaction = this.db.transaction(this.db_store_name, "readwrite");  
        var store = transaction.objectStore(this.db_store_name);  
        var request;
		if(key)
			request = store.put(val,key);
		else
			request = store.put(val);
        request.onsuccess = function(event){  
			_def.resolve(event);   
        };  
        request.onerror = function(event){  
            _def.reject(event);  
        } ;
		return _def.promise();
    }; 
	this.delete = function(key)  
    {  
		var _def = $.Deferred();
		var request;
		if(key)
    		 request = this.db.transaction(this.db_store_name, "readwrite").objectStore(this.db_store_name).delete(key);  
		else
			 request = this.db.transaction(this.db_store_name, "readwrite").objectStore(this.db_store_name).clear();  //清空
        request.onsuccess = function(event){  
			_def.resolve(event);   
        };  
        request.onerror = function(event){  
            _def.reject(event);  
        } ;
		return _def.promise();
    };  
    this.select = function(key)  
    {  
        var _def = $.Deferred();
        var transaction = this.db.transaction(this.db_store_name,"readwrite");  
        var store = transaction.objectStore(this.db_store_name);  
        if(key)  
            var request = store.get(key);  
        else  
            var request = store.getAll();  
  
        request.onsuccess = function () {  
            _def.resolve(request.result);  
        } ;
        request.onerror = function(event){  
            _def.reject(event);  
        } ;
		return _def.promise();
    };  
}