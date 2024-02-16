/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/m/MessageToast",
	"sap/ui/core/MessageType"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Sorter, MessageToast, MessageType) {
	"use strict";

	return BaseController.extend("zzcus.sd.salesprices.manage.controller.History", {

		formatter: formatter,
		sPath: "",

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		constructor: function () {
			this._oBusyModel = null;
			this._oTable = null;
			this._oSmartFilterBar = null;
			this._oSmartTable = null;
			this._oFailedButton = null;
			this._oSuccessButton = null;
		},

		onInit: function () {
			this._oSmartFilterBar = this.byId("smartFilterBarHistory");
			this._oSmartTable = this.byId("lineItemsHistoryTable");
			this._oTable = this._oSmartTable.getTable();
			this._oFailedButton = this.byId("failedButton");
			this._oSuccessButton = this.byId("successedButton");

			// Initial Object
			this._oBusyModel = new JSONModel({
				isBusy: false
			});
			// Set busy model
			this.setModel(this._oBusyModel, "busy");

			// Navigation from worklist page
			this.getRouter().getRoute("history").attachPatternMatched(this._onObjectMatched, this);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		onInitSmartFilterBar: function (oEvent) {
			this._oSmartFilterBar.search();
		},

		onInitSmartTable: function (oEvent) {
			// Disable active header
			this._oTable.bActiveHeaders = false;

			// Set Default sorter
			this._oSmartTable.applyVariant({
				sort: {
					sortItems: [{
						columnKey: "CndnRecdImportDateTime",
						operation: "Descending"
					}]
				}
			});

			// Tabel selection mode
			this._oTable.setMode("SingleSelectLeft");
		},

		onSearch: function (oEvent) {
			if (this._oTable.getShowOverlay()) {
				this._oTable.setShowOverlay(false);
			}
		},

		onFilterChange: function (oEvent) {
			if (!this._oTable.getShowOverlay()) {
				this._oTable.setShowOverlay(true);
			}

			this._EnableButtons("0");
		},

		onAssignedFiltersChanged: function (oEvent) {
			var oStatusText = this.byId("historyStatusText");
			if (oStatusText && this._oSmartFilterBar) {
				var sText = this._oSmartFilterBar.retrieveFiltersWithValuesAsText();
				oStatusText.setText(sText);
			}
		},

		onDownloadFailed: function (oEvent) {
			var sUuid = this.getModel().getData(this.sPath).ConditionRecordUUID;
			var downloadLogPath = "/DownloadLogSet(UUID=guid'" + sUuid + "',TYPE='E'" + ")/$value";
			var sUrl = this.getOwnerComponent().getModel().sServiceUrl + downloadLogPath;
			sap.m.URLHelper.redirect(sUrl, false);
		},

		onDownloadSuccessed: function (oEvent) {
			var sUuid = this.getModel().getData(this.sPath).ConditionRecordUUID;
			var downloadLogPath = "/DownloadLogSet(UUID=guid'" + sUuid + "',TYPE='S'" + ")/$value";
			var sUrl = this.getOwnerComponent().getModel().sServiceUrl + downloadLogPath;
			sap.m.URLHelper.redirect(sUrl, false);
		},

		onIssueIconPressed: function (oEvent) {
			if (!this._oHintDialog) {
				var oView = this.getView();
				this._oHintDialog = sap.ui.xmlfragment(oView.getId(),
					"zzcus.sd.salesprices.manage.view.IssuePopover", this);
				this._oHintDialog.setModel(oView.getModel());
				oView.addDependent(this._oHintDialog);
				this._oHintDialog.setResizable(false);
			}
			this._oHintDialog.openBy(oEvent.getSource());
		},

		onSelectionChange: function (oEvent) {
			this.sPath = oEvent.getParameter("listItem").getBindingContextPath();
			var oContext = this.getModel().getData(this.sPath);
			this._EnableButtons(oContext.CndnRecdImportStatus);
		},

		onUpdateFinished: function (oEvent) {
			var oSelectedItem = this._oTable.getSelectedItem();
			if (oSelectedItem !== undefined && oSelectedItem !== null) {
				var sPath = oSelectedItem.getBindingContextPath();
				var oContext = this.getModel().getData(sPath);
				this._EnableButtons(oContext.CndnRecdImportStatus);
			} else {
				this._EnableButtons("0");
			}
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
		_onObjectMatched: function (oEvent) {
			if (this._oSmartFilterBar._bIsInitialized) {
				this._oSmartFilterBar.search();
			}
		},

		_EnableButtons: function (sStatus) {
			switch (sStatus) {
			case "0":
				this._oFailedButton.setEnabled(false);
				this._oSuccessButton.setEnabled(false);
				break;
			case "1":
				this._oFailedButton.setEnabled(true);
				this._oSuccessButton.setEnabled(false);
				break;
			case "2":
				this._oFailedButton.setEnabled(true);
				this._oSuccessButton.setEnabled(true);
				break;
			case "3":
				this._oFailedButton.setEnabled(false);
				this._oSuccessButton.setEnabled(true);
				break;
			case "4":
				this._oFailedButton.setEnabled(false);
				this._oSuccessButton.setEnabled(false);
				break;
			}
		}

	});
});