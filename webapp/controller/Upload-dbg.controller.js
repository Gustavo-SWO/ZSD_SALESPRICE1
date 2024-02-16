/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/library",
	"sap/m/Text",
	"sap/ui/unified/FileUploaderParameter",
	"./BaseController",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (Button, Dialog, mobileLibrary, Text, FileUploaderParameter, BaseController, MessageToast,
	MessageBox) {
	"use strict";

	return BaseController.extend("zzcus.sd.salesprices.manage.controller.Upload", {

		onUploadCancel: function () {
			this.byId("uploadDialog").close();
		},

		onUploadClose: function () {
			this.byId("uploadDialog").destroy();
		},

		onFileUpload: function () {
			var oFileUploader = this.getView().byId("fileUploader");
			oFileUploader.removeAllHeaderParameters();
			if ((!this.csrfToken) && oFileUploader.getValue()) {
				if (oFileUploader.getValue().length > 100) {
					MessageBox.error(this.getText("maxFileLength"), {
						actions: MessageBox.Action.CLOSE
					});
				} else {
					this.csrfToken = this.getView().getModel().getSecurityToken();
					oFileUploader.setSendXHR(true);
					var headerParma = new FileUploaderParameter();
					headerParma.setName("x-csrf-token");
					headerParma.setValue(this.csrfToken);
					oFileUploader.addHeaderParameter(headerParma);

					var headerParma2 = new FileUploaderParameter();
					headerParma2.setName("slug");
					var encodeFileName = encodeURI(oFileUploader.getValue());
					headerParma2.setValue(encodeFileName);
					oFileUploader.addHeaderParameter(headerParma2);
					oFileUploader.upload();
					this.byId("uploadDialog").setBusy(true);
				}
			} else {
				oFileUploader.setValueState(sap.ui.core.ValueState.Error);
				oFileUploader.setValueStateText(this.getText("missingEntry"));
			}
		},

		handleValueChange: function (oEvent) {
			if (oEvent.getParameter("newValue")) {
				this.getView().byId("fileUploader").setValueState(sap.ui.core.ValueState.None);
			}
		},

		onTypeMissMatch: function () {
			MessageBox.error(this.getText("fileUploadTypeMissmatch"));
		},

		onUploadComplete: function (oEvent) {
			this.byId("uploadDialog").close();
			var responseRaw = oEvent.getParameters().headers["sap-message"];
			if (responseRaw) {
				var viewHistText = this.getText("viewHistory");
				var oRouter = this.getView().getViewData().controller.getRouter();
				var asynFlag = this._parseResponseAsyn(responseRaw);
				if (asynFlag === true) {
					this._showAsynInfo(this.getText("importStarted"), viewHistText, oRouter);
				} else {
					this._showImportResult(responseRaw, viewHistText, oRouter);
				}
			}
			this._parseEmptyFileName(oEvent);
			var aVirusMsg = this._parseVirus(oEvent);
			if (aVirusMsg) {
				this._showError(aVirusMsg);
			}
		},

		_parseVirus: function (oEvent) {
			var responseRaw = oEvent.getParameters().responseRaw;
			var regex = /<message>(.+?)<\/message>/g;
			var aMsg = responseRaw.match(regex);
			if (aMsg && responseRaw.indexOf("PRCG_CNDNRECORD_API/091") > 0) {
				return aMsg[0].replace("<message>", "").replace("<\/message>", "");
			}
			return null;
		},

		_parseEmptyFileName: function (oEvent) {
			if (oEvent.getParameters().response.search("PRCG_CNDNRECORD_API/107") !== -1) {
				MessageBox.error(this.getText("uploadFileNameEmpty"), {
					actions: MessageBox.Action.CLOSE
				});
			}
		},

		_parseResponse: function (responseRaw) {
			var regexMsg = /<message>(.+?)<\/message>/g;
			var aMsg = responseRaw.match(regexMsg);
			if (aMsg && aMsg.length === 3) {
				var sFailedLine = aMsg[1].toString().match(/-?[0-9]\d*-?/g).toString();
				var sSuccessLine = aMsg[2].toString().match(/-?[0-9]\d*-?/g).toString();
				var sUuid = aMsg[0].toString().slice(14, 14 + 32);
				var rxGetGuidGroups = /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/;
				sUuid = sUuid.replace(rxGetGuidGroups, "$1-$2-$3-$4-$5");
			}
			return {
				sFailedLine: sFailedLine,
				sSuccessLine: sSuccessLine,
				sUuid: sUuid
			};
		},

		_parseResponseAsyn: function (responseRow) {
			var asynFlag;
			var regexMsg = /<message>(.+?)<\/message>/g;
			var aMsg = responseRow.match(regexMsg);
			if (aMsg.length === 1 && (aMsg[0] === "<message>asyn</message>")) {
				asynFlag = true;
			}
			return asynFlag;
		},

		_showErrorLog: function (errorMsg, sUuid, action, oRouter, flagForErrorOrWarning) {
			var downloadLogPath = "/DownloadLogSet(UUID=guid'" + sUuid + "',TYPE='E'" + ")/$value";
			var downloadLogURL = this.getView().getParent().getModel().sServiceUrl + downloadLogPath;
			var downloadFailedDataText = this.getText("downloadFailedDatas");
			if (flagForErrorOrWarning === 1) {
				MessageBox.error(errorMsg, {
					actions: [downloadFailedDataText, action, MessageBox.Action.CLOSE],
					title: this.getText("Failed"),
					contentWidth: "30%",
					contentHeight: "12%",
					emphasizedAction: downloadFailedDataText,
					onClose: function (sAction) {
						if (sAction === action) {
							oRouter.navTo("history");
						}
						if (sAction === downloadFailedDataText) {
							sap.m.URLHelper.redirect(downloadLogURL, false);
						}
					}
				});
			} else {
				MessageBox.warning(errorMsg, {
					actions: [downloadFailedDataText, action, MessageBox.Action.CLOSE],
					title: this.getText("partialSuccess"),
					contentWidth: "30%",
					contentHeight: "12%",
					emphasizedAction: downloadFailedDataText,
					onClose: function (sAction) {
						if (sAction === action) {
							oRouter.navTo("history");
						}
						if (sAction === downloadFailedDataText) {
							sap.m.URLHelper.redirect(downloadLogURL, false);
						}
					}
				});
			}
		},

		_showAsynInfo: function (infoMsg, action, oRouter) {
			MessageBox.information(infoMsg, {
				actions: [action, MessageBox.Action.CLOSE],
				contentWidth: "30%",
				contentHeight: "12%",
				onClose: function (sAction) {
					if (sAction === action) {
						oRouter.navTo("history");
					}
				}
			});
		},
		_showSuccessInfo: function (infoMsg, action, oRouter) {
			MessageBox.success(infoMsg, {
				actions: [action, MessageBox.Action.CLOSE],
				contentWidth: "30%",
				contentHeight: "12%",
				onClose: function (sAction) {
					if (sAction === action) {
						oRouter.navTo("history");
					}
				}
			});
		},

		_showImportResult: function (responseRaw, viewHistText, oRouter) {
			var flag;
			var result = this._parseResponse(responseRaw);
			if (result.sSuccessLine === "0" && result.sFailedLine === "0") {
				this._showError(this.getText("importErrorTemplate"));
			} else if (result.sSuccessLine === "0" && (result.sFailedLine === "-1" || result.sFailedLine === "1-")) {
				MessageBox.information(this.getText("importNullTemplate"), {
					actions: [MessageBox.Action.OK, MessageBox.Action.CLOSE],
					emphasizedAction: MessageBox.Action.OK
				});
			} else if (result.sSuccessLine >= "0" && (result.sFailedLine === "-1" || result.sFailedLine === "1-")) {
				MessageBox.error(this.getText("uploadMost"), {
					actions: [MessageBox.Action.OK, MessageBox.Action.CLOSE],
					emphasizedAction: MessageBox.Action.OK
				});
			} else {
				if (result.sSuccessLine) {
					if (result.sSuccessLine > 0 && result.sFailedLine === "0") {
						this._showSuccessInfo(this.getText("importSuccessText", result.sSuccessLine), viewHistText, oRouter);
					}
				} else {
					MessageToast.show(this.getText("importSuccessText", "0"), {
						width: "30em"
					});
				}
				if (result.sFailedLine > 0 && result.sSuccessLine === "0") {
					flag = 1;
					this._showErrorLog(this.getText("importErrorText"), result.sUuid, viewHistText, oRouter, flag);
				}
				if (result.sFailedLine > 0 && result.sSuccessLine > 0) {
					flag = 0;
					var totalLine = parseInt(result.sSuccessLine, 10) + parseInt(result.sFailedLine, 10);
					var totalLineString = totalLine.toString();
					var aLine = [result.sFailedLine, totalLineString];
					this._showErrorLog(this.getText("importPartialErrorText", aLine), result.sUuid, viewHistText,
						oRouter, flag);
				}
			}
		},

		_showError: function (errorMsg) {
			MessageBox.error(errorMsg, {
				actions: [MessageBox.Action.OK, MessageBox.Action.CLOSE],
				emphasizedAction: MessageBox.Action.OK
			});
		}

	});

});