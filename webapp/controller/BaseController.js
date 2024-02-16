/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/core/mvc/Controller","sap/ui/core/UIComponent","sap/m/library","sap/ui/core/message/Message","sap/m/MessagePopover","sap/m/MessageItem"],function(C,U,m,M,a,b){"use strict";return C.extend("zzcus.sd.salesprices.manage.controller.BaseController",{oMessageManager:sap.ui.getCore().getMessageManager(),getRouter:function(){return U.getRouterFor(this);},getModel:function(n){return this.getView().getModel(n);},setModel:function(o,n){return this.getView().setModel(o,n);},getText:function(i,p){return this.getModel("i18n").getResourceBundle().getText(i,p);},onMessagePopoverPress:function(e){this._createMessagePopover();this._oMessagePopover.toggle(e.getSource());},_popMsg:function(){var c=this.oMessageManager.getMessageModel().getData();if(c.length>0){var o=this.byId("ShowMsg");var d=this.byId("listPage");if(d!==undefined&&!d.getShowFooter()){d.setShowFooter(true);}var n=[];for(var x in c){if(n.indexOf(c[x])===-1&&c[x].message!==""){n.push(c[x]);}}this.oMessageManager.getMessageModel().setData(n);this._createMessagePopover();o.rerender();this._oMessagePopover.openBy(o);}},_addMsg:function(c,t,d,l,e){var T=null;var L="";var s="";if(d!==undefined){T=d;L=l;s=e;}else{var f=this.oMessageManager.getMessageModel().getData();for(var i in f){if(c===f[i].message){return;}}}var o=new M({message:c,type:t,additionalText:L,descriptionUrl:s,target:T,processor:this.getModel()});this.oMessageManager.addMessages(o);},_clearMsg:function(){this.oMessageManager.removeAllMessages();},_removeMsg:function(){var c=this.oMessageManager.getMessageModel("message").getData();for(var i in c){if(c[i].controlIds.length===0){this.oMessageManager.removeMessages(c[i]);}}},_createMessagePopover:function(){if(!this._oMessagePopover){this._oMessagePopover=new a({activeTitlePress:function(e){var i=e.getParameter("item"),o=i.getBindingContext("message").getObject(),c=sap.ui.getCore().byId(o.getControlId());if(c){c.focus();}},items:{path:"message>/",template:new b({type:"{message>type}",title:"{message>message}",subtitle:"{message>additionalText}",longtextUrl:"{message>descriptionUrl}",activeTitle:{parts:[{path:"message>controlIds"}],formatter:this._isPositionable}})}});this.byId("ShowMsg").addDependent(this._oMessagePopover);}},_isPositionable:function(c){return(c.length>0)?true:false;}});});