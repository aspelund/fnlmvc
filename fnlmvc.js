/**	
 *
 * (C)2009 49lights AB
 * FNLMVC Core
 *
 *
 **/
 
// Simple logging if there is a html-element with id FNLLog
function log(message){
	try{		
		$('FNLLog').innerHTML += message + "<br/>"; 
	}catch(e){
	}
}

var FNLElementClass = Class.create({
indexOf:function(parent, child){
	if(!parent.hasChildNodes())
		return -1;
	for(var i=0;i<parent.childNodes.length;i++)
		if(parent.childNodes[i]==child)
			return i;
	return -1;
},
insertAfter:function(child, newChild){	
	var parent = child.parentNode;
	var i = this.indexOf(parent, child);
	if(i<0){
		parent.appendChild(newChild);
		return;
	}
	if(i==parent.childNodes.length-1){
		parent.appendChild(newChild);
		return;
	}else{
		parent.insertBefore(newChild,parent.childNodes[i+1]);
		return;
	}
},
insertBefore:function(child, newChild){
	child.parentNode.insertBefore(newChild,child);
},
firstChild:function(parent){
	for(i=0;i<parent.childNodes.length;i++)
		if(Object.isElement(parent.childNodes[i]) && ! Object.isString(parent.childNodes[i]))
			return parent.childNodes[i];
	return -1;
},
strToHtmlElement:function(str){
	var obj = document.createElement('div');
	obj.innerHTML = str;
	return this.firstChild(obj);
}
});
FNLElement = new FNLElementClass();

// Some event constants
var FNLToolsEvents = {
	ajaxResponse:1,
	product_favorite_state_change:2,
	ajaxInsertDone:4,
	ajaxResponsePageUpdate:8	
};

/*
	Alternative eventlistener for non-dom events. 
*/
var FNLEventListener = Class.create({
	listener:false, id:false,event:false,priority:false,callbackFunction:false,
	defaultPriority:200,
	initialize:function(params){
		if(params.listener)
			this.listener = params.listener;
		if(params.id)
			this.id=params.id;
		if(params.event)
			this.event=params.event;
		if(params.priority)
			this.priority=params.priority;
		else
			this.priority=this.defaultPriority;
		if(params.callbackFunction)
			this.callbackFunction=params.callbackFunction;
	},
	isSameEvent:function(event){
		if(this.id==event.id && this.event==event.event)
			return true;
		else
			return false;
	},
	conflict:function(eventListener){
		if(this.isSameEvent(eventListener) && this.priority==eventListener.priority)
			return true;
		else
			return false;
	}
});
/*
 Alternative event for non-dom events. 
*/
var FNLEvent = Class.create({
bubbles:true,
data:false,
initialize:function(params){	
	this.id=params.id;
	this.event = params.event;
	if(params.model)this.model=params.model;
	if(params.extra)this.extra = params.extra;
},
stop:function(){
	this.bubbles = false;
},
toString:function(){
	return this.id + ":" + this.event + "<br/>\n";
}
});

// Event handler for events created by FNLEvent
var FNLEventListenerHandler = Class.create({
	eventListeners:false,
	initialize:function(){
		this.eventListeners = [];
	},
	removeEventListener:function(eventListener){
		for(var i=0;i<this.eventListeners.length;i++)
			if(this.eventListeners[i]==eventListener){
				this.eventListeners.splice(i,1);
				return;
			}
		//this.eventListeners = this.eventListeners.without(eventListener);		
	},
	addEventListener:function(params){
		var eventListener = new FNLEventListener(params);
		if(this.isConflictEventListener(eventListener)){
			this.eventListeners.each(function(e){
				if(e.isSameEvent(eventListener))
					e.priority--;
			});
		}
		this.eventListeners.push(eventListener);
		return eventListener;
	},	
	isConflictEventListener:function(eventListener){
		return this.eventListeners.find(function(e){return e.conflict(eventListener);});
	},
	dispatchEvent:function(event){
		var curListeners = this.eventListeners.findAll(function(e){return e.isSameEvent(event);});
		curListeners = curListeners.sortBy(function(s){return s.priority*-1;});
		curListeners.each(function(e){
			if(event.bubbles){
				e.callbackFunction(event);
			}
		});
	},
	toString:function(){
		var str = '';
		this.eventListeners.each(function(e){
			str += e.id + ":" + e.event + ":" + e.priority + ":" + e.callbackFunction + "<br/>\n";
		});
		return str;
	}
});

/*
 This little class translates data into a template.
 First, the class fetches all parameter names from the template on the form #paramname#
 Then, it looks into the provided data structure and looks for the corresponding element there.
 An example:
 
 data = {title:'Hello world'};
 template = "<h1>#title#</h1>";
 
 var trans = new FNLDataToTemplate();
 document.write(trans.matchData(template, data));
 
 this gives an output of
 <h1>Hello world</h1>
 
 It also works with substructures, #friend.name# is matched to data.friend.name
 
 The template is the id of a hidden html-element. 
*/
var FNLDataToTemplate = Class.create({
curTemplateId:false,
curDataFields:false,
initialize:function(fnlTools){
this.fnlTools = fnlTools;
},
getDataFields:function(template_id){
	if(this.curTemplateId==template_id)
		return this.curDataFields;	
	var template = $(template_id).innerHTML;
	var re = new RegExp(/#([A-Za-z0-9\.\-\_]*)#/g);
	var datafields = [];
	while(m= re.exec(template))
		if(m.length>1)
			if(datafields.indexOf(m[1])<0)
				datafields.push(m[1]);
	this.curTemplateId = template_id;
	this.curDataFields = datafields;
	return datafields;
},
_getVar:function(obj, varName){	
	var ret = false;
	try{		
		ret = eval('obj.'+varName);		
	}catch(e){
		
	}
	return ret;
},
matchData:function(template_id,data){
	datafields = this.getDataFields(template_id);
	var str = $(template_id).innerHTML;
	var self = this;
	var id = fnlTools.newUID();
	var hasElements = false;
	datafields.each(function(search){
		var r = "#" + search.replace('.',"\\.") + "#";		
		var regExp = new RegExp(r, 'g');		
		var cw;
		if((cw = self._getVar(data,search))){			
			if(Object.isElement(cw)){
				var rep = "<div id='placeholder_"+search+"_"+id+"'></div>";
				str = str.replace(regExp,rep);
				hasElements = true;
			}else{
				str = str.replace(regExp,cw);
			}
		}
	});
	if(hasElements){
		var temp = document.createElement('div');
		temp.setStyle({display:'none'});
		document.body.appendChild(temp);
		temp.innerHTML = str;
		datafields.each(function(search){			
			cw = self._getVar(data,search);
			if(cw && Object.isElement(cw)){
				//document.body.appendChild(cw);
				var id2 = 'placeholder_'+search+'_'+id;
				var ph = $(id2).parentNode;
				while(cw.hasChildNodes()){				
					var co = cw.firstChild;
					cw.removeChild(co);					
					ph.insertBefore(co,$(id2));					
				}
				ph.removeChild($(id2));
			}
		});
		document.body.removeChild(temp);
		return temp;		 				
	}
	return str;
}
});

/**
A class for handling the view part of the MVC-model.
As in zend framework, the view will be accessed as this.view, and using it is pretty straightforward:

this.view.title = "Mattias";
document.write(this.view.render('title'));

this will store the title in the view object, and the view.render will look for a class
with the name FNLView_title and call it's render method, passing itself as a variable.
*/ 
var FNLViewHandler = Class.create({
views:$H(),
initialize:function(fnlTools){
	this.fnlTools = fnlTools;
	this.translator = this.fnlTools.getTemplateTranslator();		
},
render:function(name){
	var i;
	var viewName = 'FNLView_'+name;	
	if(!this.views.get(viewName)){	
		var obj = eval(viewName);
		var renderer = new obj();
		this.views.set(viewName,renderer);
	}
	return this.views.get(viewName).render(this);	
}
});
/*
This is a handler for models - What it essentialy does is to look for any previously instanced
models and return them, if there are no such models it will try to create a new one
*/
var FNLModelHandler = Class.create({
	models:$H(),
	initialize:function(fnlTools){
		this.fnlTools = fnlTools;
	},
	_get:function(params){
		var obj;	
		if(!params.id){
			obj = FNLModel;
		}else{
			var name = 'FNLModel_'+ params.id.charAt(0).toUpperCase() + params.id.substring(1);		
			try{
				obj = eval(name);
			}catch(e){
				obj = FNLModel;
			}		
		}
		return new obj(this.fnlTools,params);
	},
	get:function(params){
		var model;
		if(!(model=this.models.get(params.id))){
			model = this._get(params); 
			this.models.set(params.id,model);
		}else{
			model.setData(params);
		}
		return model;
	}
});

// A general function for adding padding to digits.
function PadDigits(n, totalDigits) 
{ 
    n = n.toString(); 
    var pd = ''; 
    if (totalDigits > n.length) 
    { 
        for (i=0; i < (totalDigits-n.length); i++) 
        { 
            pd += '0'; 
        } 
    } 
    return pd + n.toString(); 
} 

function findChildNodeByClassName(node, className){
	if(!node.hasChildNodes())
		return false;
	for(var i=0;i<node.childNodes.length;i++){
		var curNode = node.childNodes[i];
		try{
		if(!Object.isString(curNode) && Object.isElement(curNode)){
			if(Element.hasClassName(curNode, className))
				return curNode;
		}
		}catch(e){
			console.log(curNode);
			console.log(e);
		}
	}
	for(var i=0;i<node.childNodes.length;i++){
		var curNode = node.childNodes[i];
		if(!Object.isString(curNode)){
			if((curNode = findChildNodeByClassName(curNode, className)))
				return curNode;
		}
	}
	return false;
}

/**
This is the main handler class, from which all the magic happens.
Everything is instanced from the FNLToolsClass, and an instance of the class
is also passed to all controllers and models.

Notable functions are the eventHandler and the AjaxRequestor.
It also contains a periodical executer that polls a server from time to time.

*/ 
var FNLToolsClass = Class.create({
eventListenerHandler:false,
runningajax:$H(),
fnlDataToTemplateTranslator:false,
fnlProductFavorites:false,
lastId:-1,
models:[],
ajaxListeners:$H(),
initialize:function(){
	this.eventListenerHandler = new FNLEventListenerHandler();
	this.fnlView = new FNLViewHandler(this);
	this.fnlModel = new FNLModelHandler(this);
	var requestAjaxListeners = this.requestAjaxListeners.bind(this);
	new PeriodicalExecuter(function(pe){
		requestAjaxListeners();
	},1000);
},
// This function takes all registered ajax listeners and creates a call to the server. 
requestAjaxListeners:function(){
	var self = this;	
	this.ajaxListeners.each(function(ajaxListener){
		var url = ajaxListener.key;
		curAjaxListener = ajaxListener.value;		
		var arrModels = Array();
		var arrParams = Array();		
		curAjaxListener.each(function(row){
			var model = row.key;
			var params = row.value;
			arrModels.push(model);
			arrParams.push(model+'_id='+params.max_id);			
		});
		params = 'l='+arrModels.join('+');
		params += '&'+arrParams.join('&');
		self.ajaxRequest(url,params);
	});
},
/* 
	This function registers an ajax listener to the results from a periodically run ajax call.
	Several urls can be registered. Each listener corresponds to a model
	listener is the object that is called upon a positive ajax event.
	url is the url for the polled request
	model is the name of the model in the javascript scope. 
	model_id is the unique identifier for the model as requested from the server
	max_id is the largest primary_key that exists in the javascript scope, so that polls are speedy 
*/ 
registerAjaxListener:function(listener, url, model, model_id, max_id){
	var curAjaxListeners;
	if(!(curAjaxListeners = this.ajaxListeners.get(url))){
		curAjaxListeners = $H();
		this.ajaxListeners.set(url,curAjaxListeners);
	}
	var modelListener;
	if(!(modelListener = curAjaxListeners.get(model))){
		modelListener = $H({model_id:model_id, max_id:max_id, listeners:Array()});
		curAjaxListeners.set(model,modelListener);
	}
	modelListener.max_id=max_id;
	modelListener.model_id=model_id;


	if(modelListener.get('listeners').indexOf(listener)<0)
		modelListener.get('listeners').push(listener);
		
},
/*
 This updates the ajax listener after a responce with the new maximum key value of the primary key.
*/
updateAjaxListener:function(url, model, max_id){
	var o = this.ajaxListeners.get(url).get(model);
	o.max_id = max_id;
},
getModel:function(params){
	return this.fnlModel.get(params);
},
hash:function(object){
	var str = object.toJSON();
	return crc32(str);	
},
_get:function(name, params){
	var obj = eval(name);
	return new obj(this,params);
},
// Returns a new object of type 'FNLController_' + Name, if name is requested
getController:function(name, params){
	var name = name.charAt(0).toUpperCase() + name.substring(1);		
	var controllerName = 'FNLController_' + name;
	return this._get(controllerName,params);
},
// returns a new unique identifier 
newUID:function(){
	var now = new Date().getTime();
	while(this.lastId==now)
		now = new Date().getTime();
	this.lastId = now;
    return now;	
},
// Non dom eventlistener handler capsule
addEventListener:function(params){
	return this.eventListenerHandler.addEventListener(params);
},
removeEventListener:function(eventListener){
	this.eventListenerHandler.removeEventListener(eventListener);
},
getTemplateTranslator:function(){
	if(!this.fnlDataToTemplateTranslator)
		this.fnlDataToTemplateTranslator = new FNLDataToTemplate(this);
	return this.fnlDataToTemplateTranslator;
},
/*
	This is a pretty interesting function
	It creates an event from the Ajax response and dispatches the resulting event, with data, as 
	a non-dom event (FnlEvent)
	The data should be on the form 
	data = {person:[{age:32, name:'Mattias'},{age:32, name:'Peter}]};
	this would create a FNLModel of either type FNLModel_Person or FNLModel, if there is no FNLModel_Person
	the row.id is the server scope name of the model.
*/
handleAjaxResponse:function(response){
	if(response.data){
		var self=this;
		response.data.each(function(row){	
			console.log(row.id);		
			var curModel = self.getModel({id:row.id, data:row.data});
			if(row.page)
				var event = new FNLEvent({id:row.id,event:FNLToolsEvents.ajaxResponsePageUpdate,model:curModel,extra:{page:row.page}});
			else
				var event = new FNLEvent({id:row.id,event:FNLToolsEvents.ajaxResponse,model:curModel});			
			self.eventListenerHandler.dispatchEvent(event);
		});
	}
},
/* 
 The ajax request expects a json-encoded response on the form 
 {Result:0, data:[{id:'person',age:12}]}
 with Result = 0 is success
*/
ajaxRequest:function(url,params){
    var id = url + "_" + params
    var self = this;    
    new Ajax.Request(
        url,{
             method:'post',
             postBody:params,             
             onSuccess: function(transport){
             	var json = transport.responseText;
				json = eval('('+json+')');
				if(json.Result==0){
					self.handleAjaxResponse(json);
				}
							
             },
             onFailure: function(transport) {
             }
        }
        );	    
}
});
// This is created as a middle class between a DOM-element and the FNL-world.
var FnlTargetObject = Class.create({
initialize:function(target){
	this.target = $(target);
	this.id = target;
},
addEventListener:function(event, callbackFunction, params){
	if(params){
		params.id = this.id;
		params.event = event;
		params.callbackFunction = callbackFunction;		
	}else{
	 	params = {id:this.id, event:event, callbackFunction:callbackFunction};
	}
	fnlTools.addEventListener(params);
}
});
// Function for creating FNLTargetObjects
function $FNL(target){
	return new FnlTargetObject(target);
}
/*
	FNLModel is a class that handles the Model part of the MVC.
	It is a superclass for all models, and has two main usages:
	1) Usage for "fast" data with replaceOldData - if replaceOldData is true, then 
	any ajax repsonse to this model will result in all old data being replaced by the new
	2) Usage for larger datasets with primary_key - when data is loaded, old data in the model will
	only be replaced if they have the same value on primary_key (model.data[i].primary_key == newData[j].primary_key)
	
	data is an array where every "row" should have primary_key set.
	find is a function that returns the index of a primary_key in the array, or -1 if not found
	max returns the largest value of the primary_key. 	
*/
var FNLModel = Class.create({		
	init:function(params){
		this.setData(params);
	},
	initialize:function(fnlTools, params){		
		var d = params.data;
		params = $H(params);
		params.data = d;
		this.primary_key = false;
		this.replaceOldData = true;
		this.fnlTools = fnlTools;				
		if(params.keys().indexOf('replaceOldData')>=0){			
			this.replaceOldData=params.replaceOldData;
		}
		if(params.get('primary_key')){
			this.primary_key=params.get('primary_key');
		}
		if(!this.primary_key && !this.replaceOldData){
			throw('primary_key or replaceOldData must be set');
		}
		this.init(params);		
	},
	setData:function(params){
		if(params.data){
			if(!this.data){
				this.data = params.data;
			}else{
				if(this.replaceOldData){
					this.data = params.data;
				}else{
					this.newData = Array();					
					var self = this;
					for(var i=0;i<params.data.length;i++){
						var index;
						if((index = this.find(params.data[i][this.primary_key]))>=0)
							this.data[index] = params.data[i];
						else{
							this.data.push(params.data[i]);
							this.newData.push(params.data[i][this.primary_key]);
						}
					}
					var primary_key = this.primary_key;
					this.data.sort(function(a,b){
						return (a[primary_key]>b[primary_key])*-1 + (a[primary_key]<b[primary_key])*1;
					});					
				}
			}
		}
	},
	insert:function(data){
		var str = '';
		var d = $H(data);
		var arr = Array();
		d.each(function(row){
			arr.push(row.key+ '=' + escape(row.value));
		});
		arr.push('model='+this.model_id);
		this.fnlTools.ajaxRequest(this.insertUrl,arr.join('&'));
	},
	find:function(value){		
		for(var i=0;i<this.data.length;i++){
			if(this.data[i][this.primary_key]==value)
				return i;
		}
		return -1;
	},
	max:function(){
		if(this.data.length>0){
			var max = parseInt(this.data[0][this.primary_key]);			
			for(var i=0;i<this.data.length;i++){
				if(parseInt(this.data[i][this.primary_key])>max)
					max = parseInt(this.data[i][this.primary_key]);
			}			
			return max;
		}else
			return -1;
	}
});

/**
	FNLViewSuper and FNLView_Simple handles the View part of the MVC-model.
	FNLView_Simple is the base for most view's. It executes the renderering with the viewhandler
*/
var FNLViewSuper = Class.create({
	init:function(params){		
	},
	initialize:function(fnlTools, params){
		this.fnlTools = fnlTools;
		this.init(params);
	}
});
var FNLView_Simple = Class.create(FNLViewSuper,{
	init:function(params){
		if(!this.template)
			throw('Error');
		this.template = params.template;
	},
	render:function(self){
		var str = self.translator.matchData(this.template,self);
		return str;
	}
});

/*
	This is the controller part of the MVC, the Controller superclass
	It doesn't do very much, but makes sure that every controller has this.view (which is the viewhandler)
	and the fnlTools.
	It also contains a simple class for draggables - maybe that function shouldn't be placed somewhere else.
*/
var FNLController = Class.create({	
	init:function(){
	
	},
	initialize:function(fnlTools, params){
		this.fnlTools = fnlTools;
		this.view = fnlTools.fnlView;
		//if(!Object.isUndefined(this.init))
			this.init(params);
	},
	createDraggable:function(id){
		if($(id)!=null){				
			try{
				new Draggable($(id),{revert:true,ghosting:true,onEnd:function(draggable, event){
					draggable.element.up('a').addClassName('been_dragged');
				}});
				Element.observe(id,'click',function(e){
					if(e.target.up('a')){
						var a = e.target.up('a');						
						if(a.hasClassName('been_dragged')){
							a.removeClassName('been_dragged');
							e.stop();
						}					
					}	
				});
			}catch(e){
				console.log(e);
			}
		}
	}
});

function friendlyDate(unixtime){	
	var aDate = new Date();
	aDate.setTime(1000*unixtime);
	var now = new Date();
	var diff = (now.getTime()-aDate.getTime())/1000;
	if(diff<60)
		return 'nyss';
	else if(diff<60*60)
		return Math.round(diff/60) + ' minuter sedan';
	else if(diff<60*60*12)
		return Math.round(diff/(60*60),1) + ' timmar sedan';
	else{
		var Y = aDate.getFullYear();
		var m = PadDigits(aDate.getMonth(),2);
		var d = PadDigits(aDate.getDate(),2);
		var H = PadDigits(aDate.getHours(),2);
		var s = PadDigits(aDate.getMinutes(),2);
		return Y+'-'+m+'-'+d+' '+H+':'+s;
	}
}