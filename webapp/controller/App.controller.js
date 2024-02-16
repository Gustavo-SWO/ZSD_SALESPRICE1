/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["./BaseController","sap/ui/model/json/JSONModel"],function(B,J){"use strict";return B.extend("zzcus.sd.salesprices.manage.controller.App",{onInit:function(){var v,s,o=this.getView().getBusyIndicatorDelay();v=new J({busy:true,delay:0});this.setModel(v,"appView");s=function(){v.setProperty("/busy",false);v.setProperty("/delay",o);};this.getOwnerComponent().getModel().metadataLoaded().then(s);this.getOwnerComponent().getModel().attachMetadataFailed(s);this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());}});});
