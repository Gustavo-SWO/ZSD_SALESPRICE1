/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"sap/m/library",
	"sap/ui/core/message/Message",
	"sap/m/MessagePopover",
	"sap/m/MessageItem"
], function (Controller, UIComponent, mobileLibrary, Message, MessagePopover, MessageItem) {
	"use strict";

	// shortcut for sap.m.URLHelper
	// var URLHelper = mobileLibrary.URLHelper;

	return Controller.extend("zzcus.sd.salesprices.manage.controller.BaseController", {
		oMessageManager: sap.ui.getCore().getMessageManager(),

		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		getText: function (id, params) {
			return this.getModel("i18n").getResourceBundle().getText(id, params);
		},

		onMessagePopoverPress: function (oEvent) {
			// Create message popover
			this._createMessagePopover();
			this._oMessagePopover.toggle(oEvent.getSource());
		},

		_popMsg: function () {
			var aMessageData = this.oMessageManager.getMessageModel().getData();
			if (aMessageData.length > 0) {
				var oMsgBtn = this.byId("ShowMsg");
				var oDynamicPage = this.byId("listPage");
				if (oDynamicPage !== undefined && !oDynamicPage.getShowFooter()) {
					oDynamicPage.setShowFooter(true);
				}

				// Remove messages
				var aNewMsg = [];
				for (var x in aMessageData) {
					if (aNewMsg.indexOf(aMessageData[x]) === -1 && aMessageData[x].message !== "") {
						aNewMsg.push(aMessageData[x]);
					}
				}
				this.oMessageManager.getMessageModel().setData(aNewMsg);

				this._createMessagePopover();
				oMsgBtn.rerender();
				this._oMessagePopover.openBy(oMsgBtn);
			}
		},

		_addMsg: function (msgtext, type, target, label, longtexturl) {
			var sTarget = null;
			var sLabel = "";
			var sLongtextUrl = "";
			if (target !== undefined) {
				sTarget = target;
				sLabel = label;
				sLongtextUrl = longtexturl;
			} else {
				var aMessageData = this.oMessageManager.getMessageModel().getData();
				for (var i in aMessageData) {
					if (msgtext === aMessageData[i].message) {
						return;
					}
				}
			}

			var oMessage = new Message({
				message: msgtext,
				type: type,
				additionalText: sLabel,
				descriptionUrl: sLongtextUrl,
				target: sTarget,
				processor: this.getModel()
			});
			this.oMessageManager.addMessages(oMessage);
		},

		_clearMsg: function () {
			this.oMessageManager.removeAllMessages();
		},

		_removeMsg: function () {
			var aMessageData = this.oMessageManager.getMessageModel("message").getData();
			for (var i in aMessageData) {
				if (aMessageData[i].controlIds.length === 0) {
					this.oMessageManager.removeMessages(aMessageData[i]);
				}
			}
		},

		_createMessagePopover: function () {
			if (!this._oMessagePopover) {
				this._oMessagePopover = new MessagePopover({
					activeTitlePress: function (oEvent) {
						var oItem = oEvent.getParameter("item"),
							oMessage = oItem.getBindingContext("message").getObject(),
							oControl = sap.ui.getCore().byId(oMessage.getControlId());

						if (oControl) {
							oControl.focus();
						}
					},
					items: {
						path: "message>/",
						template: new MessageItem({
							type: "{message>type}",
							title: "{message>message}",
							subtitle: "{message>additionalText}",
							longtextUrl: "{message>descriptionUrl}",
							activeTitle: {
								parts: [{
									path: "message>controlIds"
								}],
								formatter: this._isPositionable
							}
						})
					}
				});
				this.byId("ShowMsg").addDependent(this._oMessagePopover);
			}
		},

		_isPositionable: function (sControlId) {
			// Such a hook can be used by the application to determine if a control can be found/reached on the page and navigated to.
			return (sControlId.length > 0) ? true : false;
		}
	});
});