/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"./BaseController",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/MessageType",
	"../util/DynamicalAreaUtil",
	"sap/ui/generic/app/navigation/service/NavigationHandler",
	"sap/ui/comp/state/UIState"

], function (BaseController,
	formatter,
	Filter,
	FilterOperator,
	MessageType,
	DynamicalAreaUtil,
	NavigationHandler,
	UIState) {
	"use strict";

	return BaseController.extend("zzcus.sd.salesprices.manage.controller.Worklist", {

		formatter: formatter,
		aTables: [],
		aTypes: [],
		aShowObj: [],
		aCopyFields: [],
		aBingFilters: [],
		sSelectAll: "",
		vQuantityPos: "",
		vConditionTablePos: "",
		vEditStatusPos: "",
		iSizeBeforeCreate: 0,
		iRowHeight: 0,
		bValueChange: false,
		bTableChange: false,
		bQuantityUnitChange: false,
		bMaterialChange: false,
		bCalculationType: false,
		bSearch: false,
		sPopInfo: "",
		iTotalEditableRecords: 0,
		iTotalRecords: 0,
		bRateValueError: false,
		sRateValueField: "",
		bOnInitFinished: false,
		bFilterBarInitialized: false,
		bApproveFeature: false,
		aRequestConditions: [],
		bRateValueUnitchanged: false,
		vConditionLowerLimitPos: "",
		vConditionUpperLimitPos: "",

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			// Initial message model
			this._clearMsg();
			// First commit
			var oInitModel = new sap.ui.model.json.JSONModel();
			this.setModel(oInitModel, "message");

			// Get current i18n resource bundle for texts
			this._oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

			// Initial Object
			this._oSmartTable = this.byId("LineItemsSmartTable");
			this._oSmartFilterBar = this.byId("smartFilterBar");
			this._oTable = this._oSmartTable.getTable();
			this._oDraftIndi = this.byId("draftIndi");
			this._oDynamicPage = this.byId("listPage");

			// Set busy model
			this._oBusyModel = new sap.ui.model.json.JSONModel({
				isBusy: false,
				isVisible: false,
				sApproveInfo: ""
			});
			this.setModel(this._oBusyModel, "busy");

			// Set Smart table selection mode
			this._oTable.setSelectionMode("MultiToggle");
			var oPlugins = new sap.ui.table.plugins.MultiSelectionPlugin({
				limit: 0,
				enableNotification: true
			});
			oPlugins.attachSelectionChange(this._onRowSelectionChange, this);
			this._oPlugins = oPlugins;
			this._oTable.addPlugin(oPlugins);

			// Row select change event
			this._oTable.attachRowSelectionChange(this._onRowSelectionChange, this);

			// table validation error event
			this._oTable.attachParseError(this._onPopMsg, this);
			this._oTable.attachValidationError(this._onPopMsg, this);

			// For restore filter
			this.oNavigationHandler = new NavigationHandler(this);
			this.bOnInitFinished = true;
			this.initAppState();

			// Editing Status text
			var oText = new sap.m.Text({
				text: {
					parts: [{
						path: "Status"
					}, {
						path: "i18n>draft"
					}, {
						path: "i18n>noAuthorization"
					}, {
						path: "i18n>blockedCustomer"
					}, {
						path: "i18n>unchanged"
					}],
					formatter: function (sStatus, sDraft, sNoAuth, sBlocked, sUnchanged) {
						var sStatusText;
						switch (sStatus) {
							case "A":
								sStatusText = sNoAuth;
								break;
							case "B":
								sStatusText = sBlocked;
								break;
							case "D":
								sStatusText = sDraft;
								break;
							case "U":
								sStatusText = sUnchanged;
								break;
						}

						return sStatusText;
					}
				}
			});
			this.oTemplate = new sap.ui.layout.HorizontalLayout({
				content: [oText]
			});

			var sIgnoreFields =
				"ConditionRecordUUID,ConditionSequentialNumber,ConditionApplication,CreatedByUser,CreationDate,ConditionTextID,CndnMaxNumberOfSalesOrders," +
				"PricingScaleType,PricingScaleBasis,ConditionScaleQuantity,ConditionScaleQuantityUnit,ConditionScaleAmount,ConditionScaleAmountCurrency," +
				"ConditionAlternativeCurrency,ConditionTypeName,MainItmMatlPricingGroupName,MainItemPricingRefMaterialName," +
				"MaximumConditionBasisValue,MaximumConditionAmount,IncrementalScale,ValidOnDate,AccessNumberOfAccessSequence,ConditionIsDeleted," +
				"ETag,ConditionRecordIsEditable,MaterialName,PersonFullName,WorkPackageName,WBSDescription,DistributionChannelName,SalesOrganizationName,PaymentTermsName," +
				"EngmtProjectServiceOrgName,CustomerName,PricingScaleLine,WorkItemName,EngagementProjectName,ConditionQuantityUnit,MinimumConditionBasisValue," +
				"ConditionCalculationTypeName,DepartureCountryName,SalesDocumentItemText,BillableControlName,IndustryKeyText,CityCodeName,CountyName,ConditionExclusion," +
				"TechnicalObjectTypeDesc,EquipmentName,IncotermsClassificationName,CustomerGroupName,CustomerPriceGroupName,SoldToPartyName,PayerPartyName," +
				"ShipToPartyName,SupplierName,DestinationCountryName,MaterialGroupName,ReturnsRefundExtentDesc,AdditionalMaterialGroup1Name,AdditionalMaterialGroup2Name," +
				"AdditionalMaterialGroup3Name,AdditionalMaterialGroup4Name,AdditionalMaterialGroup5Name,PriceListTypeName,RegionName,TimeSheetOvertimeCategoryText," +
				"CommodityCodeText,TaxJurisdictionName,MaterialPricingGroupName,VariantConditionName,SalesOfficeName,SalesGroupName,TransactionCurrencyName,PlantName," +
				"SDDocumentCategoryName,DivisionName,SlsOrderSalesOrganizationName,OrderQuantityUnitName,PlantRegionName,ConditionRecordIsDraft,ProductHierarchyNodeText," +
				"AccountTaxType,ConsumptionTaxCtrlCode,BRSpcfcTaxBasePercentageCode,BRSpcfcTxGrpDynTaxExceptions,CustomerTaxClassification1,CustomerTaxClassification2," +
				"CustomerTaxClassification3,CustomerTaxClassification4,ProductTaxClassification1,ProductTaxClassification2,ProductTaxClassification3,ProductTaxClassification4," +
				"TaxJurisdiction,BRSpcfcTaxDepartureRegion,BRSpcfcTaxDestinationRegion,TaxCode,BR_NFDocumentType,BRSpcfcFreeDefinedField1,BRSpcfcFreeDefinedField2," +
				"BRSpcfcFreeDefinedField3,TxRlvnceClassfctnForArgentina,BR_TaxCode,LocalSalesTaxApplicabilityCode,ShippingTypeName,ConditionRateValueUnit," +
				"ConditionChangeReason,ConditionChangeReasonText,ConditionReleaseStatusText";
			this._oSmartTable.setIgnoreFromPersonalisation(sIgnoreFields);

			// this.byId("edit").setEnabled(false);
			// this.byId("export").setEnabled(false);

			this._handleFeature();
		},

		onExit: function () {
			if (this._oMessagePopover) {
				this._oMessagePopover.destroy();
			}
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		/**
		 * Triggered by the table's 'beforeRebindTable' event:
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onBeforeRebindTable: function (oEvent) {
			var mBindingParams = oEvent.getParameter("bindingParams");
			var oTableBind = this._oTable.getBinding();
			if (oTableBind === undefined) {
				// Set message model
				this._clearMsg();
				this.setModel(this.oMessageManager.getMessageModel(), "message");
			}

			// Special logic for creating
			// this._getDraftStatus();
			// var sStatus = this._oDraftStatus.getSelectedKey();
			var sStatus = "all";
			var aFilters = [];
			if (mBindingParams.filters.length === 0 && sStatus === "all" && this.aShowObj.length > 0) {
				if (this.iSizeBeforeCreate <= this.aShowObj.length) {
					for (var xy = 0; xy < this.aShowObj.length; xy++) {
						aFilters.push(new Filter("ConditionRecord", FilterOperator.EQ, this.aShowObj[xy]));
					}
					mBindingParams.filters.push(new Filter({
						filters: aFilters,
						and: false
					}));
				}
				return;
			}

			// Editing Status as filter
			if (sStatus !== "all") {
				switch (sStatus) {
					case "ownDraft":
						mBindingParams.filters.push(new Filter("IsActiveEntity", FilterOperator.EQ, false));
						break;
					case "unchanged":
						mBindingParams.filters.push(new Filter({
							filters: [new Filter("IsActiveEntity", FilterOperator.EQ, true),
							new Filter("HasDraftEntity", FilterOperator.EQ, false)
							],
							and: true
						}));
						break;
				}
			}

			// this._getFilterMethod();
			// var sFilterMethod = this._oFilterMethod.getSelectedKey();
			var aParamsFilterData = mBindingParams.filters;

			//Process the ValidOnDate, Convert it to ConditionValidityStartDate <= ValidOnDate <= ConditionValidityEndDate
			this._parseDateFilter(aParamsFilterData, mBindingParams);

			//Process the Normal filters
			if (aParamsFilterData.length !== 0 && aParamsFilterData[0].aFilters) {
				this._processNormalFilter(aParamsFilterData, mBindingParams, "ConditionRecord");
				// this._processNormalFilter(aParamsFilterData, mBindingParams, "SalesPriceApprovalRequest");
			}

			// //For "Filter with applicable criteria only", split the filter condition and remove the automatically generated filter condition
			// if (sFilterMethod === "OR") {
			// 	this._parseFilterMethod(aParamsFilterData, mBindingParams);
			// }

			// Show new created data in worklist table
			this._rebuildFilter(mBindingParams);

			// For Export excel
			this.aBingFilters = mBindingParams;
		},

		onSFBAfterVariantLoad: function (oEvent) {
			this._createDynamicaAreaUtil();
			this._oDynamicalAreaUtil.aKeyFieldsResult = [];

			// Get filter data of condition type
			var oConditionType = oEvent.getSource().getFilterData().ConditionType;
			if (oConditionType !== undefined) {
				if (this._onGetFilterType(oConditionType)) {
					return;
				}
			} else {
				this.aTypes = [];
			}

			// Get filter data of condition table
			var oConditionTable = oEvent.getSource().getFilterData().ConditionTable;
			if (oConditionTable !== undefined) {
				if (this._onGetFilterTable(oConditionTable)) {
					return;
				}
			} else {
				this.aTables = [];
			}

			if (this.aTypes.length > 0) {
				if (this.aTables.length > 0) {
					this._oDynamicalAreaUtil.setFilterValues([{
						"name": "ConditionType",
						"values": this.aTypes
					}, {
						"name": "ConditionTable",
						"values": this.aTables
					}]);
				} else {
					this._oDynamicalAreaUtil.setFilterValues([{
						"name": "ConditionType",
						"values": this.aTypes
					}]);
				}

			} else {
				if (this.aTables.length > 0) {
					this._oDynamicalAreaUtil.setFilterValues([{
						"name": "ConditionTable",
						"values": this.aTables
					}]);
				} else {
					this._oDynamicalAreaUtil.setFilterValues();
				}
			}

			this._oDynamicalAreaUtil.changeDynamicalArea(undefined, undefined, true);
		},

		onSaveVariant: function (oEvent) {
			var oUiState = this._oSmartTable.getUiState();
			var oPV = oUiState.getPresentationVariant();
			var oViz = oPV.Visualizations[0];
			var aVisibleColumns = this._oTable._getVisibleColumns();
			var bSave = false;

			if (oViz.Content.length !== aVisibleColumns.length) {
				bSave = true;
			} else {
				var aColumnNames = [];
				for (var y = 0; y < oViz.Content.length; y++) {
					aColumnNames.push(oViz.Content[y].Value);
				}
				for (var z = 0; z < aVisibleColumns.length; z++) {
					var aColumnId = aVisibleColumns[z].getId().split("-");
					var sFieldName = aColumnId[aColumnId.length - 1];
					if (aColumnNames.indexOf(sFieldName) === -1) {
						bSave = true;
						break;
					}
				}
			}

			if (bSave) {
				oViz.Content = [];
				for (var x = 0; x < aVisibleColumns.length; x++) {
					aColumnId = aVisibleColumns[x].getId().split("-");
					sFieldName = aColumnId[aColumnId.length - 1];

					var oVisibleColumn = {};
					oVisibleColumn.Value = sFieldName;
					oViz.Content.push(oVisibleColumn);
				}

				// Update the UI State on the smart table
				this._oSmartTable.setUiState(oUiState);

			}
		},

		onAssignedFiltersChanged: function (oEvent) {
			var oStatusText = this.byId("statusText");
			if (oStatusText && this._oSmartFilterBar) {
				var sText = this._oSmartFilterBar.retrieveFiltersWithValuesAsText();
				oStatusText.setText(sText);
			}
		},

		onFilterChange: function (oEvent) {
			// Initial message manager
			this._clearMsg();

			// Clear creating buffer
			this.aShowObj = [];

			// Unselect rows
			this._oPlugins.clearSelection();

			// Change to display mode
			this._setTableDisplayed();

			// Return from this function
			if (oEvent.getParameter("afterFilterDataUpdate") || oEvent.getParameter("sId") === "valueListChanged" || oEvent.getParameter(
				"mParameters") === undefined) {
				return;
			}

			// Disable buttons
			// this.byId("create").setEnabled(false);
			// this.byId("edit").setEnabled(false);
			// this.byId("import").setEnabled(false);
			// this.byId("export").setEnabled(false);
			// var sStatus = this._oSmartFilterBar.getControlByKey("EditingStatus").getSelectedKey();
			// if (sStatus === "ownDraft") {
			// 	this.byId("download").setEnabled(false);
			// } else {
			// this.byId("download").setEnabled(true);
			// }

			var iIndexofConditionType = oEvent.getParameter("mParameters").id.toString().search("ConditionType");
			var iIndexofConditionTable = oEvent.getParameter("mParameters").id.toString().search("ConditionTable");
			if (iIndexofConditionType !== -1 || iIndexofConditionTable !== -1) {
				//Create DynamicallAreaUtil
				this._createDynamicaAreaUtil();

				var oSource = oEvent.getParameter("oSource");
				var sNotSupport = this._oResourceBundle.getText("filterNotSupported");
				if (oSource.getValueStateText() === sNotSupport) {
					oSource.setValueState("None");
					oSource.setValueStateText("");
				} else if (oSource.getValueState() === "Error") {
					return;
				}

				this._buildDynamicFilter(oSource, iIndexofConditionType, iIndexofConditionTable, sNotSupport);
				// No coding allowed after this method
			}
		},

		onValueChange: function (oEvent) {
			// Initial message manager
			this._removeMsg();
			if (this._oMessagePopover) {
				this._oMessagePopover.close();
			}

			// Draft indicator status
			this._oDraftIndi.clearDraftState();
			this.bValueChange = true;

			var oModel = this.getModel();
			var oSource = oEvent.getParameter("changeEvent").getSource();
			var sFieldName = oSource.getDataProperty().typePath;
			var sTarget = oSource._sBindingContextPath + "/" + sFieldName;
			var aMessageData = this.oMessageManager.getMessageModel("message").getData();
			var bUnitChanged = oEvent.getParameter("changeEvent").getParameter("unitChanged");
			// Special logic for Uom when entering with error
			if (bUnitChanged && oSource.getInnerControls()[1].getValueState() === "Error") {
				oSource.getInnerControls()[1].setValue(oModel.getData(sTarget + "Unit"));
				oSource.getInnerControls()[1].setValueState("None");
				oSource.getInnerControls()[1].setValueStateText("");
			}

			// Dynamically collect the highlighted messages
			this.sRateValueField = "";
			if (oSource.getValueState() === "Error") {
				var bFound = false;
				for (var i in aMessageData) {
					if (aMessageData[i].target === sTarget && aMessageData[i].message === oSource.getValueStateText()) {
						bFound = true;
						break;
					}
				}
				if (!bFound) {
					this._addMsg(oSource.getValueStateText(), MessageType.Error, sTarget, oSource._sAnnotationLabel);
				}

				// Error message handling
				if (sFieldName !== "ConditionRateValue" && sFieldName !== "ConditionLowerLimit" && sFieldName !== "ConditionUpperLimit") {
					this._popMsg();
				} else {
					if (this.bRateValueError) {
						this._popMsg();
					} else {
						this.sRateValueField = sFieldName;
						oSource.attachValidationSuccess(this._onRemoveErrorMsg, this);
					}
				}
				this.bRateValueError = false;
				return;

			} else {
				this._removeErrorMsg(aMessageData, sTarget);
				oModel.bSequentializeRequests = true;
				this.bRateValueError = false;
			}

			if (sFieldName === "ConditionRateValue" || sFieldName === "ConditionLowerLimit" || sFieldName === "ConditionUpperLimit") {
				this.bRateValueUnitchanged = bUnitChanged;
			} else {
				this.bRateValueUnitchanged = false;
			}

			this._handleValueChange(oEvent);
			// No coding allowed after this method
		},

		onSearch: function (oEvent) {
			// Initial message manager
			this.getModel().resetChanges();
			this._clearMsg();

			// Clear creating buffer 
			this.aShowObj = [];

			// Unselect rows
			this._oPlugins.clearSelection();

			// Change to display mode
			this._setTableDisplayed();

			// Set buttons enabled
			// this.byId("create").setEnabled(true);
			// var sStatus = this._oSmartFilterBar.getControlByKey("EditingStatus").getSelectedKey();
			// if (sStatus === "ownDraft") {
			// 	this.byId("import").setEnabled(false);
			// 	this.byId("download").setEnabled(false);
			// } else {
			// 	this.byId("import").setEnabled(true);
			// this.byId("download").setEnabled(true);
			// }
			this.bSearch = true;

			this.storeCurrentAppState();
		},

		onAfterTableVariantSave: function (oEvent) {
			this.storeCurrentAppState();
		},

		onCreate: function (oEvent) {
			var oModel = this.getModel();
			oModel.resetChanges();

			// Initial message manager
			this._clearMsg();
			this._oDraftIndi.clearDraftState();

			this.iSizeBeforeCreate = this._oTable.getTotalSize();
			if (this._checkGroup()) {
				return;
			}

			// Prepare payload
			var oCreate = this._onBeforeCreate();

			this._oBusyModel.setProperty("/isBusy", true);
			oModel.setRefreshAfterChange(false);
			oModel.create("/C_SlsPricingConditionRecordTP", oCreate, {
				success: function (oData) {
					// Change to edit mode
					this._setTableEditable();

					this.aShowObj.push(oData.ConditionRecord);
					this._switchStatus("Create");
					this._oSmartTable.rebindTable(true);
					this._onRowSelectionChange();
					this._oBusyModel.setProperty("/isBusy", false);
				}.bind(this),

				error: function (oData) {
					this._processOneRequestFail(oData);
				}.bind(this)
			});
		},

		onImport: function (oEvent) {
			var that = this;
			sap.ui.core.mvc.XMLView.create({
				viewName: "zzcus.sd.salesprices.manage.view.Upload",
				viewData: {
					controller: this
				}
			}).then(function (oView) {
				that.getView().addDependent(oView);
				oView.byId("uploadDialog").open();
			});
		},

		onExport1: function (oEvent) {
			this.onFileDownload(false);
		},

		onExport2: function (oEvent) {
			this.onFileDownload(true);
		},

		onFileDownload: function (bWithText) {
			var oModel = this.getModel();
			oModel.setRefreshAfterChange(false);
			oModel.setUseBatch(true);
			oModel.setDeferredGroups(["batchExportGroup"]);
			oModel.setHeaders({
				"DownloadExcel": "X"
			});
			this._oBusyModel.setProperty("/isBusy", true);
			// Read call to item entity set for passing filters
			oModel.read("/C_SlsPricingConditionRecordTP", {
				filters: this.aBingFilters.filters,
				groupId: "batchExportGroup",
				urlParameters: {
					"$top": "1"
				}
			});
			// Call for the get stream
			var sText = (bWithText) ? "X" : "";
			sText = ",TextFlag='" + sText + "')";
			var sSorterString = this._fillDownloadDataSorter(this._oSmartTable);
			var sPath = "/DownloadExcelSet(FilterString='filter',SorterString='" + sSorterString + "'" + sText;
			oModel.read(sPath, {
				groupId: "batchExportGroup"
			});
			// Submit batch requests
			this._batchRequestForDownloadData(oModel);
		},

		onFileTemplateDownload: function () {
			var oFilters = this._oSmartFilterBar.getFilters();
			if (oFilters.length) {
				var aFilters = this._fillDownloadTemplateFilter(oFilters);
				var sFilterString = this._parseTemplateFilterToString(aFilters.aFilterType, aFilters.aFilterTable);
			} else {
				sFilterString = "";
			}

			var sPath = "/DownloadExcelTemplateSet(FilterString='" + sFilterString +
				"')/$value";
			var URL = this.getOwnerComponent().getModel().sServiceUrl + sPath;
			sap.m.URLHelper.redirect(URL, false);
		},

		onHistory: function (oEvent) {
			this.storeCurrentAppState();
			var oRouter = this.getRouter();
			oRouter.navTo("history");
		},

		onEdit: function (oEvent) {
			// Initial message manager
			this._clearMsg();
			this._oDraftIndi.clearDraftState();

			// Get Table data
			var oTableBind = this._oTable.getBinding();
			if (oTableBind === undefined) {
				this._addMsg(this._oResourceBundle.getText("noDataFoundText"), MessageType.Information);
				this._popMsg();
				return;
			} else {
				var iTotalCount = oTableBind.getLength();
				if (iTotalCount === 0) {
					this._addMsg(this._oResourceBundle.getText("noDataFoundText"), MessageType.Information);
					this._popMsg();
					return;
				} else {
					if (this._checkGroup()) {
						return;
					}
				}
			}

			this._oBusyModel.setProperty("/isBusy", true);
			var oModel = this.getModel();
			oModel.setRefreshAfterChange(false);

			// Prepare editing data
			var oEditData = this._buildEditData();

			// Submit the updating batch request changes
			if (oEditData.bEdit) {
				oModel.callFunction("/AE3B72B4F1AA3073D427AEditconditionrecord", {
					"method": "POST",
					urlParameters: {
						ConditionRecordUUID: oEditData.sRecordUUIDs,
						IsActiveEntity: true,
						Preservechanges: true,
						Totalcount: oEditData.iRequestTotalCount
					},
					success: function (oData, oResponse) {
						// this._processSuccess(oData, "createDraftFailText");

						this._clearMsg();
						var aNoAuthorityObj = [];
						var aInfoText = [];
						var aInfoType = [];
						var sMsg = oResponse.headers["sap-message"];
						if (sMsg) {
							this._prepareMessage("noEditAuthority", sMsg, aNoAuthorityObj, aInfoText, aInfoType);
						}
						this._setTableEditable();
						this._switchStatus("Edit");

						//Rebind Table
						this._oSmartTable.rebindTable(true);
						this._onRowSelectionChange();

						// Messages of conditions
						this._showMessage(aNoAuthorityObj, aInfoText, aInfoType, false, "createDraftFailText");
						this._oBusyModel.setProperty("/isBusy", false);
					}.bind(this),

					error: function (oData) {
						this._processOneRequestFail(oData);
					}.bind(this)
				});

			} else {
				this._oBusyModel.setProperty("/isBusy", false);
				this._setTableEditable(oEditData.bIsGroup);
				this._onRowSelectionChange();

				var oContext = this._oTable.getContextByIndex(0);
				if (oContext !== undefined && oContext.getProperty("IsActiveEntity")) {
					this._setTableDisplayed();
				}
				if (this.sPopInfo !== "") {
					this._addMsg(this._oResourceBundle.getText(this.sPopInfo), MessageType.Information);
					this._popMsg();
				}
			}
		},

		onCancel: function (oEvent) {
			// Initial message manager
			this._clearMsg();
			this._oDraftIndi.clearDraftState();

			sap.m.MessageBox.warning(this.getText("cancelQuestionText"), {
				actions: [sap.m.MessageBox.Action.DELETE, sap.m.MessageBox.Action.CANCEL],
				onClose: function (vChoice) {
					var oModel = this.getModel();
					oModel.resetChanges();

					var iTotalCount = this._oTable.getBinding().getLength();
					if (vChoice === sap.m.MessageBox.Action.DELETE) {
						this._oBusyModel.setProperty("/isBusy", true);
						oModel.setUseBatch(true);
						oModel.setDeferredGroups(["batchDeleteDraft"]);
						oModel.setRefreshAfterChange(false);

						// Delete draft
						var bCancel;
						for (var x = 0; x < iTotalCount; x++) {
							var oContext = this._oTable.getContextByIndex(x);
							if (oContext) {
								var iStart = oContext.sPath.search("IsActiveEntity=") + 15;
								var sIsActive = oContext.sPath.substr(iStart, 5);
								if (sIsActive === "false") {
									bCancel = true;
									oModel.remove(oContext.sPath, {
										groupId: "batchDeleteDraft"
									});
								}
							} else {
								break;
							}
						}

						if (bCancel) {
							oModel.submitChanges({
								groupId: "batchDeleteDraft",
								success: function (oData) {
									this._processSuccess(oData, "deleteDraftFailText");
								}.bind(this),

								error: function (oData) {
									this._processFail(oData);
								}.bind(this)
							});
						} else {
							this._oBusyModel.setProperty("/isBusy", false);

							// Change to display mode
							this._setTableDisplayed();
							this._switchStatus("Cancel");
							this._oSmartTable.rebindTable(true);
							this._onRowSelectionChange();
						}

					} else {
						// Change to display mode
						this._setTableDisplayed();
						this._switchStatus("Cancel");
						if (Object.keys(this._oSmartFilterBar.getFilterData()).length === 0) {
							this.aShowObj = [];
						}
						this._oSmartTable.rebindTable(true);
						this._onRowSelectionChange();
					}
				}.bind(this)
			});
		},

		onSave: function (oEvent) {
			// Initial message manager
			this._removeMsg();
			this._oDraftIndi.clearDraftState();

			// Validation check before saving
			if (this._checkBeforeSave()) {
				this._popMsg();
				return;
			}

			this.iTotalEditableRecords = 0;
			var oModel = this.getModel();
			oModel.setRefreshAfterChange(false);
			oModel.setUseBatch(true);
			oModel.setDeferredGroups(["batchSaveGroup"]);
			this._oBusyModel.setProperty("/isBusy", true);

			// Save data
			var bSave;
			var iTotalCount = this._oTable.getBinding().getLength();
			for (var x = 0; x < iTotalCount; x++) {
				var oContext = this._oTable.getContextByIndex(x);
				if (oContext) {
					var iStart = oContext.sPath.search("IsActiveEntity=") + 15;
					var sIsActive = oContext.sPath.substr(iStart, 5);
					if (sIsActive === "false") {
						bSave = true;
						iStart = oContext.sPath.search("ConditionRecordUUID=guid'") + 25;
						var sRecordUUID = oContext.sPath.substr(iStart, 36);

						oModel.callFunction("/C_SlsPricingConditionRecordTPActivation", {
							"method": "POST",
							urlParameters: {
								ConditionRecordUUID: sRecordUUID,
								IsActiveEntity: sIsActive
							},
							groupId: "batchSaveGroup"
						});
						this.iTotalEditableRecords++;
					}
				} else {
					break;
				}
			}

			// Submit the updating batch request changes
			if (bSave) {
				oModel.bSequentializeRequests = true;
				oModel.submitChanges({
					groupId: "batchSaveGroup",
					success: function (oData) {
						this._processSuccess(oData, "saveConditionFailText");
					}.bind(this),

					error: function (oData) {
						this._processFail(oData);
					}.bind(this)
				});

			} else {
				this._oBusyModel.setProperty("/isBusy", false);

				// Change to display mode
				this._setTableDisplayed();
				this._switchStatus("Save");
				//Rebind Table
				this._oSmartTable.rebindTable(true);
				this._onRowSelectionChange();
			}

		},

		onRequestApprove: function (oEvent) {
			// Initial message manager
			this._clearMsg();
			this._oDraftIndi.clearDraftState();

			// Check rows selected
			if (this._selectRowCheck()) {
				return;
			}

			// Grouped line could not be change
			if (this._checkGroup()) {
				return;
			}

			// Prepare simulation data
			var oApprovalRequest = this._buildAQData();

			// Simulation request
			this._oBusyModel.setProperty("/isBusy", true);
			var oModel = this.getModel();
			oModel.setRefreshAfterChange(false);
			if (oApprovalRequest.bSend) {
				this.aRequestConditions = [];
				oModel.callFunction("/C_SlsPricingConditionRecordTPSimulate", {
					"method": "POST",
					urlParameters: {
						ConditionRecordUUID: oApprovalRequest.sRecordUUIDs,
						IsActiveEntity: true,
						Preservechanges: true,
						Totalcount: oApprovalRequest.iRequestTotalCount
					},
					success: function (oData, oResponse) {
						this._processAQSuccess(oResponse, "requestSimulation", oApprovalRequest.bAll);
					}.bind(this),

					error: function (oData) {
						this._processOneRequestFail(oData);
					}.bind(this)
				});

			} else {
				// No valided conditions
				this._oBusyModel.setProperty("/isBusy", false);
			}
		},

		// onWithdrawApprove: function (oEvent) {
		// 	this._clearMsg();
		// },

		onSubmitRequest: function (oEvent) {
			// Validation check
			if (this._oDescription.getValue() === "") {
				this._oDescription.setValueState("Error");
				this._oDescription.setValueStateText(this._oResourceBundle.getText("noEntry"));
			}

			if (this._oDescription.getValueState() !== "None") {
				this._oDescription.focus();
			} else {
				// Close approve dialog
				this._closeApproveDialog();

				// Initial message manager
				this._clearMsg();

				// Trigger approval request
				this._oBusyModel.setProperty("/isBusy", true);
				var sRecordUUIDs = "";
				for (var i = 0; i < this.aRequestConditions.length; i++) {
					if (sRecordUUIDs === "") {
						sRecordUUIDs = this.aRequestConditions[i];
					} else {
						sRecordUUIDs = sRecordUUIDs + "," + this.aRequestConditions[i];
					}
				}
				var oModel = this.getModel();
				oModel.setRefreshAfterChange(false);
				oModel.callFunction("/AE3B72B4F1AA3073D427A3Requestforapproval", {
					"method": "POST",
					urlParameters: {
						ConditionRecordUUID: sRecordUUIDs,
						IsActiveEntity: true,
						Preservechanges: true,
						Totalcount: this.aRequestConditions.length
					},
					success: function (oData, oResponse) {
						this._processAQSuccess(oResponse, "submitApproval");
					}.bind(this),

					error: function (oData) {
						this._processOneRequestFail(oData);
					}.bind(this)
				});
			}
		},

		onCloseApprove: function (oEvent) {
			this._closeApproveDialog();
		},

		onInputChange: function (oEvent) {
			var oSource = oEvent.getSource();
			var sInput = oSource.getValue();

			if (sInput === "") {
				oSource.setValueState("Error");
				oSource.setValueStateText(this._oResourceBundle.getText("noEntry"));
			} else {
				oSource.setValueState("None");
				oSource.setValueStateText("");
			}
		},

		onCopy: function (oEvent) {
			// Initial message manager
			this._clearMsg();
			this._oDraftIndi.clearDraftState();

			// Check rows selected
			if (this._selectRowCheck()) {
				return;
			}

			// Check data 
			if (this._checkActivedata()) {
				return;
			} else {
				this.iSizeBeforeCreate = this._oTable.getTotalSize();
				if (this._checkGroup()) {
					return;
				}
			}

			var oModel = this.getModel();
			oModel.setRefreshAfterChange(false);
			oModel.setUseBatch(true);
			oModel.setDeferredGroups(["batchCopyGroup"]);
			this._oBusyModel.setProperty("/isBusy", true);
			// Select all button
			var aSelectObj = [];
			if (this.sSelectAll === "true") {
				var iTotalCount = this._oTable.getBinding().getLength();
				for (var y = 0; y < iTotalCount; y++) {
					aSelectObj.push(y);
				}
			} else {
				aSelectObj = this._oPlugins.getSelectedIndices();
			}

			// Copy creating draft for active data
			this.sPopInfo = "";
			var bCopy;
			for (var x = 0; x < aSelectObj.length; x++) {
				var oContext = this._oTable.getContextByIndex(aSelectObj[x]);
				if (oContext) {
					var oContextData = oModel.getData(oContext.sPath);
					if (oContextData.Status === "U") {
						// Copy object
						this._buildCopyData(oContext);
						bCopy = true;
					} else if (oContextData.Status === "A") {
						this.sPopInfo = "copyinfomsg";
					} else if (oContextData.Status === "B") {
						this.sPopInfo = "copyinfomsg";
					}
				} else {
					break;
				}
			}

			// Submit the updating batch request changes
			if (bCopy) {
				oModel.submitChanges({
					groupId: "batchCopyGroup",
					success: function (oData) {
						this._processSuccess(oData, "copyConditionFailText");
					}.bind(this),

					error: function (oData) {
						this._processFail(oData);
					}.bind(this)
				});
			} else {
				this._oBusyModel.setProperty("/isBusy", false);
				this._addMsg(this._oResourceBundle.getText(this.sPopInfo), MessageType.Information);
				this._popMsg();
			}
		},

		onDelete: function (oEvent) {
			// Initial message manager
			this._clearMsg();
			this._oDraftIndi.clearDraftState();

			// Check rows selected
			if (this._selectRowCheck()) {
				return;
			}

			if (this._checkGroup()) {
				return;
			}

			// Check delete data
			if (!this._checkDeleteData()) {
				this._addMsg(this._oResourceBundle.getText("deleteWFerror"), MessageType.Error);
				this._popMsg();
				return;
			}

			sap.m.MessageBox.warning(this._oResourceBundle.getText("deleteConditionText"), {
				title: this._oResourceBundle.getText("delete"),
				actions: [sap.m.MessageBox.Action.DELETE, sap.m.MessageBox.Action.CANCEL],
				onClose: function (vChoice) {
					if (vChoice === sap.m.MessageBox.Action.DELETE) {
						this._deleteConditions();
					}
				}.bind(this)
			});
		},

		onDataReceived: function (oEvent) {
			var iCount = this._oTable.getBinding().iTotalSize;
			this.iTotalRecords = iCount;
			// No data found after click Go button
			if (iCount === -1 && this.bSearch) {
				this.bSearch = false;
				this._oSmartTable.rebindTable(true);
				return;
			} else {
				this.bSearch = false;
			}

			// Force to set display mode
			// if (!this.byId("create").getEnabled()) {
			// 	this.byId("create").setEnabled(true);
			// }

			// var sStatus = this._oSmartFilterBar.getControlByKey("EditingStatus").getSelectedKey();
			// if (sStatus === "ownDraft") {
			// 	this.byId("import").setEnabled(false);
			// 	this.byId("download").setEnabled(false);
			// } else {
			// 	this.byId("import").setEnabled(true);
			// this.byId("download").setEnabled(true);
			// }
			if (iCount === "0" || iCount <= 0) {
				this._setTableDisplayed();
				// this.byId("edit").setEnabled(false);
				// this.byId("export").setEnabled(false);
				var oData = oEvent.getParameter("mParameters").data;
				if (oData !== undefined && oData.__batchResponses[0].headers["sap-message"] !== undefined) {
					this._popMsg();
				}
			} else {
				if (!this._oSmartTable.getEditable()) {
					// this.byId("edit").setEnabled(this.byId("create").getEnabled());
					// if (this._oSmartFilterBar.getFilters().length) {
					// 	if (sStatus === "unchanged" || sStatus === "all") {
					// 		this.byId("export").setEnabled(this.byId("create").getEnabled());
					// 	}
					// }
				} else {
					// If the first row is active entity, then set display mode
					var oContext = this._oTable.getContextByIndex(0);
					if (oContext !== undefined && oContext.getProperty("IsActiveEntity")) {
						this._setTableDisplayed();
					}
				}
			}

			// Set Table column width
			this._setColumnWidth();
			// Set Table row height
			this._oTable.setRowHeight(this.iRowHeight);
		},

		onInitSmartTable: function (oEvent) {
			// var aCommonFields = ["ConditionValidityStartDate", "ConditionValidityEndDate", "ConditionRateValue", "ConditionQuantity",
			// 	"ConditionLowerLimit", "ConditionUpperLimit", "ConditionText", "PaymentTerms", "FixedValueDate", "AdditionalValueDays",
			// 	"ConditionToBaseQtyNmrtr", "ConditionToBaseQtyDnmntr", "BaseUnit", "ConditionCalculationType", "ConditionRecord",
			// 	"SalesPriceApprovalRequest", "ConditionProcessingStatus", "ConditionReleaseStatus", "Status"
			// ];
			// var aSortDisableFields = ["PaymentTerms", "FixedValueDate", "AdditionalValueDays", "ConditionToBaseQtyNmrtr", "ConditionText",
			// 	"ConditionToBaseQtyDnmntr", "BaseUnit", "ConditionLowerLimit", "ConditionUpperLimit", "ConditionCalculationType",
			// 	"ConditionRateValue", "ConditionRecord", "SalesPriceApprovalRequest", "ConditionProcessingStatus", "ConditionReleaseStatus"
			// ];

			// // Personalization setting columns
			// var oUiState = this._oSmartTable.getUiState();
			// var oPV = oUiState.getPresentationVariant();
			// var oViz = oPV.Visualizations[0];
			// oViz.Content = [];
			// this.aCopyFields = [];

			// // Validity columns
			// var aColumns = this._oTable.getColumns();
			// for (var m = 0; m < aColumns.length; m++) {
			// 	var aFieldNames = aColumns[m].getId().split("-");
			// 	var sFieldName = aFieldNames[aFieldNames.length - 1];
			// 	if (sFieldName === "Status") {
			// 		aColumns[m].setTemplate(this.oTemplate); //Set Draft Text
			// 		this.vEditStatusPos = m;
			// 		aColumns[m].setShowSortMenuEntry(false);
			// 	} else if (sFieldName === "ConditionQuantity") {
			// 		this.vQuantityPos = m; //Get position of Quantity column
			// 		aColumns[m].setShowSortMenuEntry(false); //Set ConditionQuantity can not sort
			// 	} else if (sFieldName === "ConditionTable") {
			// 		aColumns[m].setShowSortMenuEntry(false);
			// 		this.vConditionTablePos = m; //Get position of ConditionTable column
			// 	} else if (sFieldName === "ConditionLowerLimit") {
			// 		this.vConditionLowerLimitPos = m; //Get position of ConditionLowerLimit column
			// 		aColumns[m].setShowSortMenuEntry(false); //Set ConditionQuantity can not sort
			// 	} else if (sFieldName === "ConditionUpperLimit") {
			// 		this.vConditionUpperLimitPos = m; //Get position of ConditionUpperLimit column	
			// 		aColumns[m].setShowSortMenuEntry(false); //Set ConditionQuantity can not sort
			// 	} else if (aSortDisableFields.indexOf(sFieldName) !== -1) {
			// 		aColumns[m].setShowSortMenuEntry(false);
			// 	}

			// 	this.aCopyFields.push(sFieldName);
			// 	if (aCommonFields.indexOf(sFieldName) === -1) {
			// 		var oVisibleColumn = {};
			// 		oVisibleColumn.Value = sFieldName;
			// 		oViz.Content.push(oVisibleColumn);
			// 	}
			// }

			// // Extensibility columns
			// var aIgnoreFields = this._oSmartTable.getIgnoreFromPersonalisation().split(",");
			// for (var i in this._oSmartTable._aColumnKeys) {
			// 	if (this.aCopyFields.indexOf(this._oSmartTable._aColumnKeys[i]) !== -1 ||
			// 		aIgnoreFields.indexOf(this._oSmartTable._aColumnKeys[i]) !== -1) {
			// 		continue;
			// 	} else {
			// 		this.aCopyFields.push(this._oSmartTable._aColumnKeys[i]);
			// 		var oVisibleColumn1 = {};
			// 		oVisibleColumn1.Value = this._oSmartTable._aColumnKeys[i];
			// 		oViz.Content.push(oVisibleColumn1);
			// 	}
			// }

			// // Common columns
			// for (var n = 0; n < aCommonFields.length; n++) {
			// 	var oVisibleColumn2 = {};
			// 	oVisibleColumn2.Value = aCommonFields[n];
			// 	oViz.Content.push(oVisibleColumn2);
			// }

			// // Update the UI State on the smart table
			// this._oSmartTable.setUiState(oUiState);

			// this.iRowHeight = this._oTable._getBaseRowHeight();

			//GVCA20240228
			var aVisibleCols = ["Material", "Customer", "ConditionValidityStartDate", "ConditionValidityEndDate", "Material_fc", "MaterialName", "Customer_fc", "CustomerName", "ZZKUNZR", "ZZ1_KUNZR_PCHF", "ConditionValidityStartDate_fc", "ConditionValidityEndDate_fc", "ConditionRateValue", "ConditionRateValue_fc", "ConditionRateValueUnit", "ConditionQuantity", "ConditionQuantity_fc", "ConditionQuantityUnit", "IsActiveEntity", "DraftEntityLastChangeDateTime", "ConditionRecordIsDraft", "ConditionRateValueUnit_fc", "ConditionQuantityUnit_fc", "AdditionalMaterialGroup1", "AdditionalMaterialGroup1_fc", "AdditionalMaterialGroup1Name"];
			var aColumns = this._oTable.getColumns();
			for (var m = 0; m < aColumns.length; m++) {
				var aFieldNames = aColumns[m].getId().split("-");
				var sFieldName = aFieldNames[aFieldNames.length - 1];
				if (aVisibleCols.indexOf(sFieldName) !== -1) {
					aColumns[m].setVisible(true);
				} else {
					aColumns[m].setVisible(false);
				}
			}
		},

		onInitSmartFilterBar: function (oEvent) {
			this.bFilterBarInitialized = true;
			this.initAppState();

			// Disable Draft Administration Data fields
			var aFilterFields = this._oSmartFilterBar.getAllFilterItems();
			for (var i in aFilterFields) {
				if (aFilterFields[i].getGroupName() === "DraftAdministrativeData" || aFilterFields[i].getName() === "ConditionIsExclusive") {
					aFilterFields[i].setVisible(false);
				}
			}
		},

		initAppState: function () {
			// check if both init events for the controller and the SmartFilterBar have finished
			if (!(this.bFilterBarInitialized && this.bOnInitFinished)) {
				return;
			}

			var oParseNavigationPromise = this.oNavigationHandler.parseNavigation();
			var that = this;
			oParseNavigationPromise.done(function (oAppData, oStartupParameters, sNavType) {

				if (sNavType !== sap.ui.generic.app.navigation.service.NavType.initial) {
					var bHasOnlyDefaults = oAppData && oAppData.bNavSelVarHasDefaultsOnly;
					var oSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant(oAppData.selectionVariant);
					var aSelectionVariantProperties = oSelectionVariant.getParameterNames().concat(oSelectionVariant.getSelectOptionsPropertyNames());
					if (sNavType === sap.ui.generic.app.navigation.service.NavType.URLParams && aSelectionVariantProperties.length === 1 &&
						aSelectionVariantProperties[0] === "openMode") {
						return;
					}
					var mUIStateProperties = {
						replace: true,
						strictMode: false
					};
					var oUiState = new UIState({
						selectionVariant: JSON.parse(oAppData.selectionVariant),
						semanticDates: oAppData.semanticDates
					});
					for (var i = 0; i < aSelectionVariantProperties.length; i++) {
						that._oSmartFilterBar.addFieldToAdvancedArea(aSelectionVariantProperties[i]);
					}
					if (!bHasOnlyDefaults || that._oSmartFilterBar.getCurrentVariantId() === "") {
						that._oSmartFilterBar.clearVariantSelection();
						that._oSmartFilterBar.clear();
						that._oSmartFilterBar.setUiState(oUiState, mUIStateProperties);
					}
					if (oAppData.tableVariantId) {
						that._oSmartTable.setCurrentVariantId(oAppData.tableVariantId);
					}
					that.restoreCustomAppStateData(oAppData.customData);

					this._setFilterFromRestore(oAppData, that);
					this._oDynamicalAreaUtil.changeDynamicalArea(true);
				}

			}.bind(this));

			oParseNavigationPromise.fail(function (oError) {
				that._handleError(oError);
			});

		},

		// ---------------------------------------------
		// APP STATE HANDLING FOR BACK NAVIGATION
		// ---------------------------------------------
		storeCurrentAppState: function () {
			var oAppStatePromise = this.oNavigationHandler.storeInnerAppState(this.getCurrentAppState());
			oAppStatePromise.done(function (sAppStateKey) {
				//your inner app state is saved now; sAppStateKey was added to URL
				//perform actions that must run after save
			});
			oAppStatePromise.fail(function (oError) {
				this._handleError(oError);
			}.bind(this));
			return oAppStatePromise;
		},

		/**
		 * @returns {object} the current app state consisting of the selection variant, the table variant and additional custom data
		 */
		getCurrentAppState: function () {
			var oSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant(JSON.stringify(this._oSmartFilterBar.getUiState()
				.getSelectionVariant()));
			return {
				selectionVariant: oSelectionVariant.toJSONString(),
				tableVariantId: this._oSmartTable.getCurrentVariantId(),
				customData: this.getCustomAppStateData(),
				semanticDates: this._oSmartFilterBar.getUiState().getSemanticDates()
			};
		},

		/**
		 * @returns {object} an object of additional custom fields defining the app state (apart from the selection variant and the table variant)  
		 */
		getCustomAppStateData: function () {
			return {
				// add custom data for back navigation if necessary
			};
		},

		restoreCustomAppStateData: function (oCustomData) {
			// perform custom logic for restoring the custom data of the app state
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
		_setFilterFromRestore: function (oAppData) {
			if (oAppData.oSelectionVariant !== undefined) {
				// Clear aTypes from last navigation
				this.aTypes = [];
				this.aTables = [];

				if (oAppData.oSelectionVariant.getSelectOption("ConditionType") !== undefined) {
					for (var m = 0; m < oAppData.oSelectionVariant.getSelectOption("ConditionType").length; m++) {
						this.aTypes.push({
							key: oAppData.oSelectionVariant.getSelectOption("ConditionType")[m].Low
						});
					}
				}
				if (oAppData.oSelectionVariant.getSelectOption("ConditionTable") !== undefined) {
					for (var t = 0; t < oAppData.oSelectionVariant.getSelectOption("ConditionTable").length; t++) {
						this.aTables.push({
							key: oAppData.oSelectionVariant.getSelectOption("ConditionTable")[t].Low
						});
					}
				}
				this._oBusyModel.setProperty("/isBusy", true);
				this._createDynamicaAreaUtil();
				if (this.aTypes.length > 0) {
					if (this.aTables.length > 0) {
						this._oDynamicalAreaUtil.setFilterValues([{
							"name": "ConditionType",
							"values": this.aTypes
						}, {
							"name": "ConditionTable",
							"values": this.aTables
						}]);
					} else {
						this._oDynamicalAreaUtil.setFilterValues([{
							"name": "ConditionType",
							"values": this.aTypes
						}]);
					}

				} else {
					if (this.aTables.length > 0) {
						this._oDynamicalAreaUtil.setFilterValues([{
							"name": "ConditionTable",
							"values": this.aTables
						}]);
					} else {
						this._oDynamicalAreaUtil.setFilterValues();
					}
				}
			}
		},

		_selectRowCheck: function () {
			var aSelectedRow = this._oPlugins.getSelectedIndices();
			if (aSelectedRow.length < 1) {
				this._addMsg(this._oResourceBundle.getText("selectConditionText"), MessageType.Error);
				this._popMsg();
				return true;
			} else {
				return false;
			}
		},

		_deleteConditions: function () {
			// Initial message manager
			this.iTotalEditableRecords = 0;
			this._clearMsg();
			this._oDraftIndi.clearDraftState();
			this._oBusyModel.setProperty("/isBusy", true);

			var oModel = this.getModel();
			oModel.setRefreshAfterChange(false);
			oModel.setUseBatch(true);
			oModel.setDeferredGroups(["batchDeleteCondition"]);

			// Select all button
			var aSelectObj = [];
			if (this.sSelectAll === "true") {
				var iTotalCount = this._oTable.getBinding().getLength();
				for (var y = 0; y < iTotalCount; y++) {
					aSelectObj.push(y);
				}
			} else {
				aSelectObj = this._oPlugins.getSelectedIndices();
			}

			// Prepare for deleting
			var oDeleteObj = this._prepareDeleteData(aSelectObj);

			// Delete active data
			if (oDeleteObj.bDelete) {
				oModel.callFunction("/AE3B72B4F1AA3073D42Deleteconditionrecord", {
					"method": "POST",
					urlParameters: {
						ConditionRecordUUID: oDeleteObj.sRecordUUIDs,
						IsActiveEntity: true,
						Preservechanges: true,
						Totalcount: oDeleteObj.iRequestTotalCount
					},
					groupId: "batchDeleteCondition"
				});
			}

			if (oDeleteObj.bDeleteSend) {
				oModel.submitChanges({
					groupId: "batchDeleteCondition",
					success: function (oData) {
						this._processSuccess(oData, "deleteConditionFail");
					}.bind(this),

					error: function (oData) {
						this._processFail(oData);
					}.bind(this)
				});
			} else {
				this._oBusyModel.setProperty("/isBusy", false);
				this._addMsg(this._oResourceBundle.getText(this.sPopInfo), MessageType.Information);
				this._popMsg();
			}
		},

		_onRowSelectionChange: function (oEvent) {
			// Select all checkbox
			if (oEvent && oEvent.getParameter("selectAll") && oEvent.getParameter("selectAll") === true) {
				this.sSelectAll = "true";
			} else {
				this.sSelectAll = "false";
			}

			var bEditable = this._oSmartTable.getEditable();
			var aSelectedRow = this._oPlugins.getSelectedIndices();
			if (!bEditable && aSelectedRow.length > 0) {
				// this.byId("create").setEnabled(false);
				// this.byId("edit").setEnabled(false);

				var oCheckResult = this._checkSelectedData();
				// this.byId("requestApprove").setEnabled(oCheckResult.bSend);
				// this.byId("copy").setEnabled(oCheckResult.bCopy);
				// this.byId("delete").setEnabled(oCheckResult.bDelete);
				// this.byId("withdrawApprove").setEnabled(true);
			} else {
				// this.byId("create").setEnabled(true);
				// this.byId("edit").setEnabled(true);
				// this.byId("copy").setEnabled(false);
				// this.byId("delete").setEnabled(false);
				// this.byId("requestApprove").setEnabled(false);
				// this.byId("withdrawApprove").setEnabled(false);
			}
			// var sStatus = this._oSmartFilterBar.getControlByKey("EditingStatus").getSelectedKey();
			// if (sStatus === "unchanged" || sStatus === "all") {
			// 	if (aSelectedRow.length > 0 || this._oSmartFilterBar.getFilters().length === 0) {
			// 		this.byId("export").setEnabled(false);
			// 	} else {
			// this.byId("export").setEnabled(true);
			// }
			// }
		},

		_getDraftStatus: function () {
			if (!this._oDraftStatus) {
				this._oDraftStatus = this._oSmartFilterBar.getControlByKey("EditingStatus");
			}
		},

		_getFilterMethod: function () {
			if (!this._oFilterMethod) {
				this._oFilterMethod = this._oSmartFilterBar.getControlByKey("FilterMethod");
			}
		},

		_onRequestSent: function (oEvent) {
			// Draft saving indicator
			if (oEvent.getParameter("requests")[0].method === "MERGE" && this.bValueChange === true) {
				this._oDraftIndi.showDraftSaving();
			}

			this.getModel().bSequentializeRequests = false;
			this.bValueChange = false;
		},

		_onRequestCompleted: function (oEvent) {
			if (oEvent.getParameter("requests")[0].method === "MERGE") {
				var oModel = this.getModel();
				var sPath = oEvent.getParameter("requests")[0].url.split("?")[0];
				var sFilterURL = "/" + sPath;

				if (oEvent.getParameter("requests")[0].success === true) {
					if (this.bTableChange) {
						// Refresh Table
						this._oDynamicalAreaUtil.changeDynamicalArea(undefined, true);
					}

					if (this.bQuantityUnitChange || this.bMaterialChange || this.bCalculationType || this.bRateValueUnitchanged) {
						this._oBusyModel.setProperty("/isBusy", true);
						oModel.createBindingContext(sFilterURL, null, null, this._refectEntry.bind(this), true);

						// Clear value state
						this._clearValueState(sPath);
					}

					// Draft saved indicator
					this._oDraftIndi.showDraftSaved();

				} else {
					this._oDraftIndi.clearDraftState();

					// Remove technical messages
					var aMessageData = this.oMessageManager.getMessageModel("message").getData();
					for (var i in aMessageData) {
						if (aMessageData[i].technical && aMessageData[i].technicalDetails !== undefined) {
							this.oMessageManager.removeMessages(aMessageData[i]);
						}
					}
				}

				this.bTableChange = false;
				this.bQuantityUnitChange = false;
				this.bMaterialChange = false;
				this.bCalculationType = false;
				this.bRateValueUnitchanged = false;
			}
		},

		_onRequestFailed: function (oEvent) {
			if (oEvent.getParameter("requests")[0].method === "MERGE") {
				var oModel = this.getModel();
				var sUrl = oEvent.getParameter("requests")[0].url.split("?")[0];
				var oPendRequest = oModel.getPendingChanges()[sUrl];
				if (oPendRequest !== undefined && oPendRequest.ConditionRateValue !== undefined) {
					this._truncateRateValue(oPendRequest, sUrl, "ConditionRateValue");
				} else if (oPendRequest !== undefined && oPendRequest.ConditionLowerLimit !== undefined) {
					this._truncateRateValue(oPendRequest, sUrl, "ConditionLowerLimit");
				} else if (oPendRequest !== undefined && oPendRequest.ConditionUpperLimit !== undefined) {
					this._truncateRateValue(oPendRequest, sUrl, "ConditionUpperLimit");
				}
			}
		},

		_refectEntry: function (oData) {
			this._oBusyModel.setProperty("/isBusy", false);
		},

		_createDynamicaAreaUtil: function () {
			// Create DynamicallAreaUtil
			if (!this._oDynamicalAreaUtil) {
				this._oDynamicalAreaUtil = new DynamicalAreaUtil(this._oSmartFilterBar, this._oSmartTable, this._oBusyModel);
				this._oDynamicalAreaUtil.setDataSource(this.getOwnerComponent().getModel(), "/I_SlsPrcgKeyCombinationField");
			}
		},

		_checkActivedata: function () {
			// Get selected lines
			var aSelectObj = this._oPlugins.getSelectedIndices();

			var aInvalidObj = [];
			for (var x = 0; x < aSelectObj.length; x++) {
				var oContext = this._oTable.getContextByIndex(aSelectObj[x]);
				if (oContext) {
					var sPath = oContext.sPath;
					var iStart = sPath.search("IsActiveEntity=") + 15;
					var sIsActive = sPath.substr(iStart, 4);
					if (sIsActive !== "true") {
						var oModel = this.getModel();
						var vRecordID = oModel.getData(sPath).ConditionRecord;
						aInvalidObj.push(vRecordID);
					}
				} else {
					break;
				}
			}

			if (aInvalidObj.length > 0) {
				this._oBusyModel.setProperty("/isBusy", false);
				this._addMsg(this._oResourceBundle.getText("activeActionFailText"), MessageType.Error);
				this._popMsg();
				return true;

			} else {
				return false;
			}
		},

		_processSuccess: function (oData, sMessageText) {
			// Initial message manager
			this._clearMsg();

			var oChangeResponse = oData.__batchResponses[0].__changeResponses;
			if (!oChangeResponse) {
				this._handleResopnseError(oData.__batchResponses[0].response.body);
				return;
			}

			var bShowToaster = false;
			var aNoAuthorityObj = [];
			var aInfoText = [];
			var aInfoType = [];
			if (sMessageText === "saveConditionFailText") {
				bShowToaster = true;
				// Change to display mode
				this._setTableDisplayed();
				// Add message to message manager
				var aSimulationData = [];
				var sMsg = oChangeResponse[0].headers["sap-message"];
				if (sMsg) {
					this._prepareMessage("noSaveAuthority", sMsg, aNoAuthorityObj, aInfoText, aInfoType, aSimulationData);
				}
				this._switchStatus("Save");
				// Submit approve request dialog
				if (this.bApproveFeature === true && aSimulationData.length > 0) {
					this.aRequestConditions = [];
					this._triggerSaveWF(aSimulationData);
				}

			} else if (sMessageText === "copyConditionFailText") {
				// Change to edit mode
				this._setTableEditable();
				for (var x = 0; x < oChangeResponse.length; x++) {
					this.aShowObj.push(oChangeResponse[x].data.ConditionRecord);
				}
				this._switchStatus("Copy");

			} else if (sMessageText === "deleteDraftFailText") {
				this._setTableDisplayed();
				this._switchStatus("Cancel");

			} else if (sMessageText === "deleteConditionFail") {
				bShowToaster = true;
				sMsg = oChangeResponse[0].headers["sap-message"];
				if (sMsg) {
					this._prepareMessage("noDeleteAuthority", sMsg, aNoAuthorityObj, aInfoText, aInfoType);
				}
			}

			//Rebind Table
			this._oSmartTable.rebindTable(true);
			this._onRowSelectionChange();

			// Messages of conditions
			this._showMessage(aNoAuthorityObj, aInfoText, aInfoType, bShowToaster, sMessageText);

			this._oBusyModel.setProperty("/isBusy", false);
		},

		_processAQSuccess: function (oResponse, sMessageText, bAll) {
			// Initial message manager
			this._clearMsg();

			var oAPMessage = oResponse.headers["sap-message"];
			if (!oAPMessage) {
				// No returned data
				return;
			}

			this._oBusyModel.setProperty("/isBusy", false);
			if (sMessageText === "requestSimulation") {
				var oMsgObject = JSON.parse(oAPMessage);
				var aSimulationText = oMsgObject.message.split("/");
				var aWorkFlow = [];
				var aRequestCondition = [];
				if (aSimulationText.length > 1) {
					aRequestCondition.push(aSimulationText[0]);
					aWorkFlow.push(aSimulationText[1]);
				}

				for (var z = 0; z < oMsgObject.details.length; z++) {
					aSimulationText = oMsgObject.details[z].message.split("/");
					if (aSimulationText.length > 1) {
						// ConditionUUID
						if (aRequestCondition.indexOf(aSimulationText[0]) === -1) {
							aRequestCondition.push(aSimulationText[0]);
						}
						// WorkFlowID
						if (aWorkFlow.indexOf(aSimulationText[1]) === -1) {
							aWorkFlow.push(aSimulationText[1]);
						}
					}
				}

				if (aWorkFlow.length > 0) {
					this.aRequestConditions = aRequestCondition;
					this._createApproveDialog("requestApprove", aWorkFlow.length, bAll);
				} else {
					// No workflow returned, no dialog need
					this._oSmartTable.rebindTable(true);
					this._onRowSelectionChange();
				}

			} else if (sMessageText === "submitApproval") {
				//Rebind Table
				this._oSmartTable.rebindTable(true);
				this._onRowSelectionChange();

				oMsgObject = JSON.parse(oAPMessage);
				var aRequestID = [];
				aRequestID.push(oMsgObject.message);
				for (z = 0; z < oMsgObject.details.length; z++) {
					if (aRequestID.indexOf(oMsgObject.details[z].message) === -1) {
						aRequestID.push(oMsgObject.details[z].message);
					}
				}
				for (z = 0; z < aRequestID.length; z++) {
					var sRequestID = this._oResourceBundle.getText("submitRequestText", aRequestID[z]);
					this._addMsg(sRequestID, MessageType.Information);
				}
				this._popMsg();
			}
		},

		_processFail: function (oData) {
			this._oBusyModel.setProperty("/isBusy", false);

			// Initial message manager
			this._clearMsg();

			// Add error message to message manager
			var sMsg = $(oData.responseText).find("message").first().text();
			if (sMsg !== "") {
				this._addMsg(sMsg, MessageType.Error);
				this._popMsg();
			} else {
				// Time out Please refresh
			}
		},

		_processOneRequestFail: function (oData) {
			this._oBusyModel.setProperty("/isBusy", false);

			// Initial message manager
			this._clearMsg();

			try {
				var sMsg = $(oData.responseText).find("message").first().text();
				if (sMsg !== "") {
					this._addMsg(sMsg, MessageType.Error);
					this._popMsg();
				} else {
					// Time out Please refresh
				}

			} catch (error) {
				// Add error message to message manager
				this._handleResopnseError(oData.responseText);
			}
		},

		_setTableEditable: function (bIsGroup) {
			// Initial message manager
			this._clearMsg();

			var bEditable = this._oSmartTable.getEditable();
			if (!bEditable && !bIsGroup) {
				var oModel = this.getModel();
				oModel.setUseBatch(true);
				oModel.setRefreshAfterChange(false);
				oModel.setDeferredGroups(["batchDraft"]);
				this._oBusyModel.setProperty("/isVisible", true);
				this._oSmartTable.setEditable(true);

				// Draft indicator status event handling
				oModel.attachBatchRequestSent(this._onRequestSent, this);
				oModel.attachBatchRequestCompleted(this._onRequestCompleted, this);
				oModel.attachBatchRequestFailed(this._onRequestFailed, this);
			}

			if (!this._oDynamicPage.getShowFooter()) {
				this._oDynamicPage.setShowFooter(true);
			}
		},

		_setTableDisplayed: function () {
			// Clear draft indicator status
			this._oDraftIndi.clearDraftState();

			var bEditable = this._oSmartTable.getEditable();
			if (bEditable) {
				this._oBusyModel.setProperty("/isVisible", false);
				this._oSmartTable.setEditable(false);
				var oModel = this.getModel();
				oModel.detachBatchRequestSent(this._onRequestSent, this);
				oModel.detachBatchRequestCompleted(this._onRequestCompleted, this);
				oModel.detachBatchRequestFailed(this._onRequestFailed, this);
			}

			if (this._oDynamicPage.getShowFooter() && this.oMessageManager.getMessageModel("message").getData().length === 0) {
				this._oDynamicPage.setShowFooter(false);
			}
		},

		_setMessageType: function (sMessageSeverity) {
			var sMessageType;
			if (sMessageSeverity === "info") {
				sMessageType = MessageType.Information;
			} else if (sMessageSeverity === "warning") {
				sMessageType = MessageType.Warning;
			} else {
				sMessageType = MessageType.Success;
			}
			return sMessageType;
		},

		_draftExist: function (aTakeOverObjs) {
			var sQusetion = this._oResourceBundle.getText("warningTextFirst") + " \n ";
			for (var x = 0; x < aTakeOverObjs.length; x++) {
				sQusetion = sQusetion + " \n " + aTakeOverObjs[x];
			}
			sQusetion = sQusetion + " \n \n " + this._oResourceBundle.getText("warningTextLast");

			sap.m.MessageBox.warning(sQusetion, {
				actions: [this._oResourceBundle.getText("edit"), sap.m.MessageBox.Action.CANCEL],
				onClose: function (vChoice) {
					if (vChoice === this._oResourceBundle.getText("edit")) {
						this._takeOverDraft();
					}
				}.bind(this),
				initialFocus: this._oResourceBundle.getText("edit")
			});
		},

		_takeOverDraft: function () {
			// Initial message manager
			this._clearMsg();

			this._oBusyModel.setProperty("/isBusy", true);

			var oModel = this.getModel();
			oModel.setRefreshAfterChange(false);

			// Create draft for active data
			var oEditData = this._buildEditData();

			oModel.callFunction("/AE3B72B4F1AA3073D427AEditconditionrecord", {
				"method": "POST",
				urlParameters: {
					ConditionRecordUUID: oEditData.sRecordUUIDs,
					IsActiveEntity: true,
					Preservechanges: false,
					Totalcount: oEditData.iRequestTotalCount
				},
				success: function (oData) {
					// Error handling
					this._clearMsg();
					var oChangeResponse = oData.__batchResponses[0].__changeResponses;
					if (!oChangeResponse) {
						this._handleResopnseError(oData.__batchResponses[0].response.body);
						return;
					}
					this._switchStatus("Edit");
					this._takeOverCreateDraft();
				}.bind(this),

				error: function (oData) {
					this._processOneRequestFail(oData);
				}.bind(this)
			});
		},

		_takeOverCreateDraft: function () {
			// Initial message manager
			this._clearMsg();

			var oModel = this.getModel();
			oModel.setRefreshAfterChange(false);

			// Create draft for active data
			var oEditData = this._buildEditData();
			oModel.callFunction("/AE3B72B4F1AA3073D427AEditconditionrecord", {
				"method": "POST",
				urlParameters: {
					ConditionRecordUUID: oEditData.sRecordUUIDs,
					IsActiveEntity: true,
					Preservechanges: false,
					Totalcount: oEditData.iRequestTotalCount
				},
				success: function (oData, oResponse) {
					// Initial message manager
					this._clearMsg();

					var aNoAuthorityObj = [];
					var aInfoText = [];
					var aInfoType = [];
					var sMsg = oResponse.headers["sap-message"];
					if (sMsg) {
						this._prepareMessage("noEditAuthority", sMsg, aNoAuthorityObj, aInfoText, aInfoType);
					}

					// Switch to edit mode
					this._setTableEditable();

					//Rebind Table
					this._oSmartTable.rebindTable(true);
					this._onRowSelectionChange();

					// Messages of conditions
					this._showMessage(aNoAuthorityObj, aInfoText, aInfoType, false, "createDraftFailText");
					this._oBusyModel.setProperty("/isBusy", false);
				}.bind(this),

				error: function (oData) {
					this._processOneRequestFail(oData);
				}.bind(this)
			});
		},

		_setColumnWidth: function () {
			this._createDynamicaAreaUtil();
			var iLength = this._oDynamicalAreaUtil.iKeyFieldsNumber + this._oDynamicalAreaUtil.aDefaultColumns.length;
			for (var i = 2; i < iLength; i++) {
				if (i === this._oDynamicalAreaUtil.iKeyFieldsNumber + 2 || i === this._oDynamicalAreaUtil.iKeyFieldsNumber + 3 || i === this._oDynamicalAreaUtil
					.iKeyFieldsNumber + 4) {
					continue;
				}
				this._oTable.autoResizeColumn(i);
			}

			// Set Quantity field width
			if (this.vQuantityPos !== "") {
				this._oTable.getColumns()[this.vQuantityPos].setWidth("200px");
			}
			// Set ConditionTable field width
			if (this.vConditionTablePos !== "") {
				this._oTable.getColumns()[this.vConditionTablePos].setWidth("120px");
			}
			// Set Editing Status field width
			if (this.vEditStatusPos !== "") {
				this._oTable.getColumns()[this.vEditStatusPos].setWidth("160px");
			}
			if (this.vConditionLowerLimitPos !== "") {
				this._oTable.getColumns()[this.vConditionLowerLimitPos].setWidth("160px");
			}
			if (this.vConditionUpperLimitPos !== "") {
				this._oTable.getColumns()[this.vConditionUpperLimitPos].setWidth("160px");
			}

			//Set the cursor on the first column
			this._oTable.autoResizeColumn(0);
		},

		_buildEditData: function () {
			var oEditData = {
				bEdit: false,
				iRequestTotalCount: 0,
				sRecordUUIDs: "",
				bIsGroup: true
			};
			var oModel = this.getModel();
			this.sPopInfo = "";
			var iTotalCount = this._oTable.getBinding().getLength();
			for (var x = 0; x < iTotalCount; x++) {
				var oContext = this._oTable.getContextByIndex(x);
				if (oContext) {
					var oContextData = oModel.getData(oContext.sPath);
					if (oContextData.Status === "U") {
						oEditData.bEdit = true;
						oEditData.iRequestTotalCount = oEditData.iRequestTotalCount + 1;
						var iStart = oContext.sPath.search("ConditionRecordUUID=guid'") + 25;
						var sRecordUUID = oContext.sPath.substr(iStart, 36);
						if (oEditData.sRecordUUIDs === "") {
							oEditData.sRecordUUIDs = sRecordUUID;
						} else {
							oEditData.sRecordUUIDs = oEditData.sRecordUUIDs + "," + sRecordUUID;
						}
					} else if (oContextData.Status === "A") {
						this.sPopInfo = "editinfomsg";
					} else if (oContextData.Status === "B") {
						this.sPopInfo = "editinfomsg";
					}
					if (oContextData.ConditionRecord !== undefined) {
						oEditData.bIsGroup = false;
					}

				} else {
					break;
				}
			}

			return oEditData;
		},

		_switchStatus: function (sAction) {
			this._getDraftStatus();
			var sStatus = this._oDraftStatus.getSelectedKey();

			switch (sStatus) {
				case "ownDraft":
					if (sAction === "Save" || sAction === "Cancel") {
						this._oDraftStatus.setSelectedKey("all");
					}
					break;
				case "unchanged":
					if (sAction === "Create" || sAction === "Edit" || sAction === "Copy" || sAction === "Save" || sAction === "Cancel") {
						this._oDraftStatus.setSelectedKey("all");
					}
					break;
			}
		},

		_checkGroup: function () {
			if (this._oTable.getGroupedColumns().length > 0) {
				this._addMsg(this._oResourceBundle.getText("actionNotAllowed"), MessageType.Error);
				this._popMsg();
				return true;
			} else {
				return false;
			}
		},

		_checkBeforeSave: function () {
			var bError = false;
			var aMessageData = this.oMessageManager.getMessageModel("message").getData();
			for (var i in aMessageData) {
				if (aMessageData[i].controlIds.length > 0) {
					bError = true;
					break;
				}
			}

			return bError;
		},

		_onBeforeCreate: function () {
			var oCreate = {};
			oCreate.ConditionSequentialNumber = "01";

			// Set Default value for condition type
			var oConditionType = this._oSmartFilterBar.getFilterData().ConditionType;
			if (oConditionType !== undefined && this._onGetFilterType(oConditionType) === false) {
				var aTypes = [];
				for (var x in this.aTypes) {
					if (aTypes.indexOf(this.aTypes[x].key) === -1) {
						aTypes.push(this.aTypes[x].key);
					}
				}
				if (aTypes.length === 1) {
					oCreate.ConditionType = aTypes[0];
				}
			}

			// Set Default value for condition table
			var oConditionTable = this._oSmartFilterBar.getFilterData().ConditionTable;
			if (oConditionTable !== undefined && this._onGetFilterTable(oConditionTable) === false) {
				var aTables = [];
				for (var y in this.aTables) {
					if (aTables.indexOf(this.aTables[y].key) === -1) {
						aTables.push(this.aTables[y].key);
					}
				}
				if (aTables.length === 1) {
					oCreate.ConditionTable = aTables[0];
				}
			}

			// Set Default value for key fields
			if (this._oDynamicalAreaUtil) {
				for (var i = 0; i < this._oDynamicalAreaUtil.aFilterFields.length; i++) {
					this._setDefaultVakey(oCreate, this._oDynamicalAreaUtil.aFilterFields[i]);
				}
			}

			return oCreate;
		},

		_onGetFilterType: function (oConditionType) {
			var bReturn = true;
			if (oConditionType.items.length === 0 && oConditionType.ranges.length === 0) {
				return bReturn;
			} else {
				bReturn = false;
				this.aTypes.splice(0, this.aTypes.length);
				for (var x = 0; x < oConditionType.items.length; x++) {
					this.aTypes.push(oConditionType.items[x]);
				}
				for (var y = 0; y < oConditionType.ranges.length; y++) {
					if (oConditionType.ranges[y].exclude === false && oConditionType.ranges[y].operation === "EQ") {
						this.aTypes.push({
							key: oConditionType.ranges[y].value1,
							text: ""
						});
					} else {
						this.aTypes = [];
						bReturn = true;
						break;
					}
				}
				return bReturn;
			}
		},

		_onGetFilterTable: function (oConditionTable) {
			var bReturn = true;
			if (oConditionTable.items.length === 0 && oConditionTable.ranges.length === 0) {
				return bReturn;
			} else {
				bReturn = false;
				this.aTables.splice(0, this.aTables.length);
				for (var i = 0; i < oConditionTable.items.length; i++) {
					this.aTables.push(oConditionTable.items[i]);
				}
				for (var j = 0; j < oConditionTable.ranges.length; j++) {
					if (oConditionTable.ranges[j].exclude === false && oConditionTable.ranges[j].operation === "EQ") {
						this.aTables.push({
							key: oConditionTable.ranges[j].value1,
							text: ""
						});
					} else {
						this.aTables = [];
						bReturn = true;
						break;
					}
				}
				return bReturn;
			}
		},

		_onRemoveErrorMsg: function (oEvent) {
			var oSource = oEvent.getSource().getParent().getParent();
			var aMessageData = this.oMessageManager.getMessageModel("message").getData();

			if (this.sRateValueField !== "") {
				var sTarget = oSource._sBindingContextPath + "/" + this.sRateValueField;
				this._removeErrorMsg(aMessageData, sTarget);
				oSource.detachValidationSuccess(this._onRemoveErrorMsg, this);

				this.sRateValueField = "";
			}
		},

		_removeErrorMsg: function (aMessageData, sTarget) {
			for (var i in aMessageData) {
				if (aMessageData[i].target === sTarget) {
					this.oMessageManager.removeMessages(aMessageData[i]);
				}
			}
		},

		_removeErrorState: function () {
			var oType = this._oSmartFilterBar.getControlByKey("ConditionType");
			var oTable = this._oSmartFilterBar.getControlByKey("ConditionTable");

			if (oType.getValueState() === "Error") {
				oType.setValue("");
				oType.setValueState("None");
				oType.setValueStateText("");
			}

			if (oTable.getValueState() === "Error") {
				oTable.setValue("");
				oTable.setValueState("None");
				oTable.setValueStateText("");
			}
		},

		_onPopMsg: function (oEvent) {
			var iIndexValue = oEvent.getSource().getParent().getParent().getAssociation("ariaLabelledBy").toString().search(
				"ConditionRateValue");
			var iIndexValue2 = oEvent.getSource().getParent().getParent().getAssociation("ariaLabelledBy").toString().search(
				"ConditionLowerLimit");
			var iIndexValue3 = oEvent.getSource().getParent().getParent().getAssociation("ariaLabelledBy").toString().search(
				"ConditionUpperLimit");

			if (iIndexValue !== -1 || iIndexValue2 !== -1 || iIndexValue3 !== -1) {
				this.bRateValueError = true;
			}
		},

		_handleError: function (oError) {
			// Implement an appropriate error handling
		},

		_batchRequestForDownloadData: function (oModel) {
			// Initial message manager
			this._clearMsg();
			this._oDraftIndi.clearDraftState();

			oModel.submitChanges({
				groupId: "batchExportGroup",
				success: function (oData, response) {
					oModel.setHeaders({
						"DownloadExcel": ""
					});
					this._oBusyModel.setProperty("/isBusy", false);
					if (response && response.data && response.data.__batchResponses[1] && response.data.__batchResponses[1].data &&
						response.data.__batchResponses[1].data.ExcelName && response.data.__batchResponses[1].data.ExcelName !== "#") {
						var excelName = response.data.__batchResponses[1].data.ExcelName;
						var excelContent = atob(response.data.__batchResponses[1].data.ExcelContent);
						var byteNumbers = new Array(excelContent.length);
						for (var i = 0; i < excelContent.length; i++) {
							byteNumbers[i] = excelContent.charCodeAt(i);
						}
						var byteArray = new Uint8Array(byteNumbers);
						var blob = new Blob([byteArray], {
							type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						});
						//IE browser
						if (sap.ui.Device.browser.msie) {
							window.navigator.msSaveOrOpenBlob(blob, excelName);
						} else {
							//Other browser
							var aTempLink = window.document.createElement("a");
							var path = window.URL.createObjectURL(blob);
							aTempLink.href = path;
							aTempLink.download = excelName;
							aTempLink.click();
						}
					} else {
						// Add error message to message manager
						this._downloadErrorHandling(oData);
					}
				}.bind(this),

				error: function (oData, response) {
					oModel.setHeaders({
						"DownloadExcel": ""
					});
					this._processFail(oData);
				}.bind(this)
			});
		},

		_fillDownloadDataSorter: function (oSmartTable) {
			var oViewSetting = oSmartTable._getTablePersonalisationData();
			if (oViewSetting) {
				var aSorters = oViewSetting.sorters;
				var sSorterParams = sap.ui.model.odata.ODataUtils.createSortParams(aSorters);
				var sSorterString = sSorterParams;
				if (sSorterString) {
					sSorterString = sSorterString.slice(9);
				} else {
					sSorterString = "";
				}
			} else {
				sSorterString = "";
			}
			return sSorterString;
		},

		_filterToString: function (oFilters, oModel) {
			var oMetaModel = oModel.getMetaModel();
			var oEntityType = oMetaModel.getODataEntityType("SD_PRICING_CONDITIONRECORD_SRV.C_SlsPricingConditionRecordTP");
			var oMetadata = oModel.getServiceMetadata();
			var sFilterString = sap.ui.model.odata.ODataUtils.createFilterParams(oFilters, oMetadata, oEntityType);
			return sFilterString;
		},

		_fillDownloadTemplateFilter: function (oFilters) {
			var oDownloadFilter = [];
			var aFilterTable = [];
			var aFilterType = [];
			oDownloadFilter.push(oFilters[0]);
			while (oDownloadFilter.length !== 0) {
				var node = oDownloadFilter.pop();
				if (node.aFilters) {
					for (var x = node.aFilters.length - 1; x >= 0; x--) {
						oDownloadFilter.push(node.aFilters[x]);
					}
				} else {
					if (node.sPath === "ConditionType") {
						if (node.oValue1) {
							node.oValue1 = node.oValue1.replace(/\'+/, "");
							node.oValue1 = node.oValue1.replace(/\'+/, "");
							node.oValue1 = "''" + node.oValue1 + "''";
						}
						aFilterType.push(node);
					}
					if (node.sPath === "ConditionTable") {
						if (node.oValue1) {
							node.oValue1 = node.oValue1.replace(/\'+/, "");
							node.oValue1 = node.oValue1.replace(/\'+/, "");
							node.oValue1 = "''" + node.oValue1 + "''";
						}
						aFilterTable.push(node);
					}
				}
			}
			return {
				aFilterType: aFilterType,
				aFilterTable: aFilterTable
			};
		},

		_parseDateFilter: function (aParamsFilterData, mBindingParams) {
			var aValidFilter = [];
			if (aParamsFilterData.length !== 0) {
				var aValidFilterItem = null;
				if (aParamsFilterData[0].aFilters) {
					for (var x in aParamsFilterData[0].aFilters) {
						if (aParamsFilterData[0].aFilters[x].sPath !== undefined && aParamsFilterData[0].aFilters[x].sPath === "ValidOnDate") {
							aValidFilterItem = aParamsFilterData[0].aFilters[x];
							aParamsFilterData[0].aFilters.splice(x, 1);
							break;
						}
					}
				} else if (aParamsFilterData[0].sPath === "ValidOnDate") {
					aValidFilterItem = aParamsFilterData[0];
					aParamsFilterData.shift();
				}
				if (aValidFilterItem) {
					aValidFilter.push(new Filter("ConditionValidityStartDate", FilterOperator.LE, aValidFilterItem.oValue1));
					aValidFilter.push(new Filter("ConditionValidityEndDate", FilterOperator.GE, aValidFilterItem.oValue1));
					mBindingParams.filters.push(new Filter({
						filters: aValidFilter,
						and: true
					}));
				}
			}
			//Process the ConditionValidityStartDate and ConditionValidityEndDate that is manually typed
			if (aParamsFilterData.length !== 0) {
				this._processValidityDate(aParamsFilterData, mBindingParams, aValidFilter);
			}
		},

		_processValidityDate: function (aParamsFilterData, mBindingParams, aValidFilter) {
			var startDateFilterItem = null;
			var endDateFilterItem = null;
			if (aParamsFilterData[0].aFilters) {
				for (var x in aParamsFilterData[0].aFilters) {
					if (aParamsFilterData[0].aFilters[x].sPath !== undefined && aParamsFilterData[0].aFilters[x].sPath ===
						"ConditionValidityStartDate") {
						startDateFilterItem = aParamsFilterData[0].aFilters[x];
						aParamsFilterData[0].aFilters.splice(x, 1);
					}
				}
			} else if (aParamsFilterData[0].sPath === "ConditionValidityStartDate") {
				startDateFilterItem = aParamsFilterData[0];
				aParamsFilterData.shift();
			}

			if (aParamsFilterData[0].aFilters) {
				for (x in aParamsFilterData[0].aFilters) {
					if (aParamsFilterData[0].aFilters[x].sPath !== undefined && aParamsFilterData[0].aFilters[x].sPath ===
						"ConditionValidityEndDate") {
						endDateFilterItem = aParamsFilterData[0].aFilters[x];
						aParamsFilterData[0].aFilters.splice(x, 1);
						if (aParamsFilterData[0].aFilters.length === 0) {
							aParamsFilterData.shift();
						}
					}
				}
			} else if (aParamsFilterData[0].sPath === "ConditionValidityEndDate") {
				endDateFilterItem = aParamsFilterData[0];
				aParamsFilterData.shift();
			}

			//only push when there is no ValidOn typed
			if (startDateFilterItem || endDateFilterItem) {
				var startEndFilter = [];
				if (aValidFilter.length === 0 && startDateFilterItem) {
					startEndFilter.push(startDateFilterItem);
				}
				if (aValidFilter.length === 0 && endDateFilterItem) {
					startEndFilter.push(endDateFilterItem);
				}
				if (startEndFilter.length !== 0) {
					mBindingParams.filters.push(new Filter({
						filters: startEndFilter,
						and: true
					}));
				}
			}
		},

		_processNormalFilter: function (aParamsFilterData, mBindingParams, sFilterName) {
			var bAnd, aConditionReocordNoItem = null;
			for (var x in aParamsFilterData[0].aFilters) {
				if (aParamsFilterData[0].aFilters[x].aFilters && aParamsFilterData[0].aFilters[x].aFilters[0].sPath === sFilterName) {
					if (x === "0" && aParamsFilterData[0].aFilters.length > 1 && aParamsFilterData[0].aFilters[1].aFilters && aParamsFilterData[0].aFilters[
						1].aFilters[0].sPath === sFilterName) {
						// Single filter with both I and E
						aConditionReocordNoItem = aParamsFilterData[0].aFilters;
						bAnd = aParamsFilterData[0].bAnd;
						aParamsFilterData.shift();
					} else {
						// Multiple filter with only I or only E
						aConditionReocordNoItem = aParamsFilterData[0].aFilters[x].aFilters;
						bAnd = aParamsFilterData[0].aFilters[x].bAnd;
						aParamsFilterData[0].aFilters.splice(x, 1);
						if (aParamsFilterData[0].aFilters.length === 0) {
							aParamsFilterData.shift();
						}
					}
					break;
				} else if (aParamsFilterData[0].aFilters[x].aFilters && aParamsFilterData[0].aFilters[x].aFilters[0].aFilters &&
					aParamsFilterData[0].aFilters[x].aFilters[0].aFilters[0].sPath === sFilterName) {
					// Multiple filter with both I and E
					aConditionReocordNoItem = aParamsFilterData[0].aFilters[x].aFilters;
					bAnd = aParamsFilterData[0].aFilters[x].bAnd;
					aParamsFilterData[0].aFilters.splice(x, 1);
					if (aParamsFilterData[0].aFilters.length === 0) {
						aParamsFilterData.shift();
					}
				} else if (aParamsFilterData[0].aFilters[x].sPath && aParamsFilterData[0].aFilters[x].sPath === sFilterName) {
					// Single filter with only I or only E
					aConditionReocordNoItem = aParamsFilterData[0].aFilters;
					bAnd = aParamsFilterData[0].bAnd;
					aParamsFilterData.shift();
					break;
				}
			}
			if (aConditionReocordNoItem) {
				mBindingParams.filters.push(new Filter({
					filters: aConditionReocordNoItem,
					and: bAnd
				}));
			}
		},

		_parseFilterMethod: function (aParamsFilterData, mBindingParams) {
			//Step1: Process the result of get field to structure {ConditionType : {ConditionTable : [ConditionFields]}}
			if (this._oDynamicalAreaUtil && this._oDynamicalAreaUtil.aKeyFieldsResult.length > 0 && this.aTypes.length !== 0) {
				var oKeyFieldsForCombination = {};
				for (var x = 0; x < this._oDynamicalAreaUtil.aKeyFieldsResult.length; x++) {
					var oFieldInfo = this._oDynamicalAreaUtil.aKeyFieldsResult[x];
					if (oFieldInfo && !oKeyFieldsForCombination[oFieldInfo.ConditionType]) {
						oKeyFieldsForCombination[oFieldInfo.ConditionType] = {};
						oKeyFieldsForCombination[oFieldInfo.ConditionType][oFieldInfo.ConditionTable] = new Array(oFieldInfo.ConditionFieldName);
					} else if (oFieldInfo && !oKeyFieldsForCombination[oFieldInfo.ConditionType][oFieldInfo.ConditionTable]) {
						oKeyFieldsForCombination[oFieldInfo.ConditionType][oFieldInfo.ConditionTable] = new Array(oFieldInfo.ConditionFieldName);
					} else if (oFieldInfo && oKeyFieldsForCombination[oFieldInfo.ConditionType][oFieldInfo.ConditionTable]
						.indexOf(oFieldInfo.ConditionFieldName) === -1) {
						oKeyFieldsForCombination[oFieldInfo.ConditionType][oFieldInfo.ConditionTable].push(oFieldInfo.ConditionFieldName);
					}
				}
			}
			//Step2: Save the FilterField Data
			if (oKeyFieldsForCombination && Object.getOwnPropertyNames(oKeyFieldsForCombination).length !== 0 && aParamsFilterData.length !==
				0) {
				var aFilterConditions = [];
				var aKeyFilterFieldData = [];
				for (x = 0; x < aParamsFilterData[0].aFilters.length; x++) {
					var aFilterItem = aParamsFilterData[0].aFilters[x];
					if (aFilterItem.aFilters && aFilterItem.aFilters[0].sPath !== "ConditionType" && aFilterItem.aFilters[0].sPath !==
						"ConditionTable" && aFilterItem.aFilters[0].sPath !== "ValidOnDate" && aFilterItem.aFilters[0].sPath !== "ConditionRecord") {
						for (var y = 0; y < aFilterItem.aFilters.length; y++) {
							var aArrayTemp = [aFilterItem.aFilters[y].sPath, aFilterItem.aFilters[y].sOperator,
							aFilterItem.aFilters[y].oValue1, aFilterItem.aFilters[y].oValue2
							];
							aKeyFilterFieldData.push(aArrayTemp);
						}
					}
				}
				//Step3: Split Search Condition and convert it to Filter
				var sKeyFieldsForCombination = Object.getOwnPropertyNames(oKeyFieldsForCombination).toString(); //oKeyFieldsForCombination.toString();
				var sKeyFilterFieldData = aKeyFilterFieldData.toString();
				for (x = 0; x < this.aTypes.length; x++) {
					var aFilterForCombination = [];
					aFilterForCombination.push(new Filter("ConditionType", FilterOperator.EQ, this.aTypes[x].key));
					if (sKeyFieldsForCombination.indexOf(this.aTypes[x].key) !== -1) {
						for (y = 0; y < Object.getOwnPropertyNames(oKeyFieldsForCombination[this.aTypes[x].key]).length; y++) {
							var sTable = Object.getOwnPropertyNames(oKeyFieldsForCombination[this.aTypes[x].key])[y];
							aFilterForCombination.push(new Filter("ConditionTable", FilterOperator.EQ, sTable));
							var aKeyFieldsForOneCombination = oKeyFieldsForCombination[this.aTypes[x].key][sTable];
							this._buildCombineFilter(aKeyFieldsForOneCombination, sKeyFilterFieldData, aKeyFilterFieldData, aFilterForCombination);

							aFilterConditions.push(new Filter({
								filters: aFilterForCombination,
								and: true
							}));
							aFilterForCombination = new Array(new Filter("ConditionType", FilterOperator.EQ, this.aTypes[x].key));
						}
						aFilterForCombination.push(new Filter("ConditionTable", FilterOperator.EQ, ""));
						aFilterConditions.push(new Filter({
							filters: aFilterForCombination,
							and: true
						}));
					}
				}
				//remove the automatically generated filter condition
				aParamsFilterData.shift();

				//add splited filter condition
				mBindingParams.filters.push(new Filter({
					filters: aFilterConditions,
					and: false
				}));
			}
		},

		_buildCombineFilter: function (aKeyFieldsForOneCombination, sKeyFilterFieldData, aKeyFilterFieldData, aFilterForCombination) {
			for (var z in aKeyFieldsForOneCombination) {
				if (sKeyFilterFieldData.indexOf(aKeyFieldsForOneCombination[z]) !== -1) {
					var aFilterDataForOneField = [];
					for (var w in aKeyFilterFieldData) {
						if (aKeyFieldsForOneCombination[z] === aKeyFilterFieldData[w][0]) {
							aFilterDataForOneField.push(new Filter(aKeyFilterFieldData[w][0], aKeyFilterFieldData[w][1],
								aKeyFilterFieldData[w][2], aKeyFilterFieldData[w][3]));
						}
					}
					if (aFilterDataForOneField.length !== 0) {
						aFilterForCombination.push(new Filter({
							filters: aFilterDataForOneField,
							and: false
						}));
					}
				}
			}
		},

		_rebuildFilter: function (mBindingParams) {
			if (this.aShowObj.length > 0) {
				var oSmartFilterTotal = {};
				oSmartFilterTotal.aFilters = [];
				oSmartFilterTotal.bAnd = true;
				oSmartFilterTotal._bMultiFilter = true;
				var iLength = mBindingParams.filters.length;
				for (var y = 0; y < iLength; y++) {
					var oFilter = JSON.parse(JSON.stringify(mBindingParams.filters[0]));
					oSmartFilterTotal.aFilters.push(oFilter);
					if (y !== iLength - 1) {
						mBindingParams.filters.splice(0, 1);
					}
				}
				var aFilters = [];
				for (var x = 0; x < this.aShowObj.length; x++) {
					aFilters.push(new Filter("ConditionRecord", FilterOperator.EQ, this.aShowObj[x]));
				}
				var oFilterObj = {};
				oFilterObj.aFilters = aFilters;
				oFilterObj.bAND = false;
				oFilterObj.bMultiFilter = true;
				var aCombineFilters = [];
				aCombineFilters.push(oSmartFilterTotal);
				aCombineFilters.push(oFilterObj);
				mBindingParams.filters[0].aFilters = aCombineFilters;
				mBindingParams.filters[0].bAnd = false;
			}
		},

		_buildDynamicFilter: function (oSource, iIndexofConditionType, iIndexofConditionTable, sNotSupport) {
			var oConditionType = this._oSmartFilterBar.getFilterData().ConditionType;
			var oConditionTable = this._oSmartFilterBar.getFilterData().ConditionTable;
			var bReturn = false;
			if (oConditionType !== undefined) {
				// Get filter data of condition type
				if (this._onGetFilterType(oConditionType)) {
					if (oConditionType.ranges.length !== 0 && iIndexofConditionType !== -1) {
						oSource.setValueState("Error");
						oSource.setValueStateText(sNotSupport);
					}
					bReturn = true;
				}

				if (oConditionTable !== undefined) {
					// Get filter data of condition table
					if (this._onGetFilterTable(oConditionTable)) {
						if (oConditionTable.ranges.length !== 0 && iIndexofConditionTable !== -1) {
							oSource.setValueState("Error");
							oSource.setValueStateText(sNotSupport);
						}
						return;
					}
					if (bReturn) {
						return;
					}

					this._oBusyModel.setProperty("/isBusy", true);
					this._oDynamicalAreaUtil.setFilterValues([{
						"name": "ConditionType",
						"values": this.aTypes
					}, {
						"name": "ConditionTable",
						"values": this.aTables
					}]);
					this._oDynamicalAreaUtil.changeDynamicalArea();
					this._removeErrorState();

				} else {
					if (bReturn) {
						return;
					}
					// Clearing cache in aTables 
					this.aTables.splice(0, this.aTables.length);
					this._oBusyModel.setProperty("/isBusy", true);
					this._oDynamicalAreaUtil.setFilterValues([{
						"name": "ConditionType",
						"values": this.aTypes
					}]);
					this._oDynamicalAreaUtil.changeDynamicalArea();
					this._removeErrorState();
				}

			} else {
				this._processNoConditionType(oSource, oConditionTable, iIndexofConditionTable, sNotSupport);
				// No coding allowed after this method
			}
		},

		_processNoConditionType: function (oSource, oConditionTable, iIndexofConditionTable, sNotSupport) {
			if (this.aTypes.length > 0) {
				// Clearing cache in aTypes 
				this.aTypes.splice(0, this.aTypes.length);
				// Clearing cache in aTables
				this.aTables.splice(0, this.aTables.length);
				this._oBusyModel.setProperty("/isBusy", true);
				this._oDynamicalAreaUtil.setFilterValues();
				this._oDynamicalAreaUtil.changeDynamicalArea();
				this._removeErrorState();

			} else {
				if (oConditionTable !== undefined) {
					// Get filter data of condition table
					if (this._onGetFilterTable(oConditionTable)) {
						if (oConditionTable.ranges.length !== 0 && iIndexofConditionTable !== -1) {
							oSource.setValueState("Error");
							oSource.setValueStateText(sNotSupport);
						}
						return;
					}

					this._oBusyModel.setProperty("/isBusy", true);
					this._oDynamicalAreaUtil.setFilterValues([{
						"name": "ConditionTable",
						"values": this.aTables
					}]);
					this._oDynamicalAreaUtil.changeDynamicalArea();
					this._removeErrorState();

				} else {
					// Clearing cache in aTables
					this.aTables.splice(0, this.aTables.length);
					this._oBusyModel.setProperty("/isBusy", true);
					this._oDynamicalAreaUtil.setFilterValues();
					this._oDynamicalAreaUtil.changeDynamicalArea();
					this._removeErrorState();
				}
			}
		},

		_handleValueChange: function (oEvent) {
			var oModel = this.getModel();
			var oSource = oEvent.getParameter("changeEvent").getSource();
			var sFieldName = oSource.getDataProperty().typePath;
			var sTarget = oSource._sBindingContextPath + "/" + sFieldName;
			var bUnitChanged = oEvent.getParameter("changeEvent").getParameter("unitChanged");
			var vNewValue = oEvent.getParameter("changeEvent").getParameter("newValue");

			if (sFieldName === "Material") {
				this.bMaterialChange = true;
				return;
			} else if (sFieldName === "ConditionCalculationType") {
				this.bCalculationType = true;
				return;
			} else if (sFieldName === "ConditionQuantity" && bUnitChanged) {
				this.bQuantityUnitChange = true;
				return;
			}

			if ((sFieldName === "ConditionToBaseQtyNmrtr" || sFieldName === "ConditionToBaseQtyDnmntr") &&
				(vNewValue.indexOf("-") === 0 || vNewValue === 0 || vNewValue === "0,000" || vNewValue === "00,000")) {
				oModel.setProperty(sTarget, oSource.getProperty("value"));
				return;
			}

			this._handleSpecificProperty(sFieldName, vNewValue, oSource);
			// No coding allowed after this method
		},

		_handleSpecificProperty: function (sFieldName, vNewValue, oSource) {
			var oModel = this.getModel();
			var aMessageData = this.oMessageManager.getMessageModel("message").getData();
			if (sFieldName === "FixedValueDate" || sFieldName === "AdditionalValueDays") {
				// Field control
				var sTargetPath;
				var iValue = (vNewValue === "" || vNewValue === "0") ? 3 : 1;
				if (sFieldName === "FixedValueDate") {
					oModel.setProperty(oSource._sBindingContextPath + "/AdditionalValueDays_fc", iValue);
					sTargetPath = oSource._sBindingContextPath + "/AdditionalValueDays";
				} else {
					oModel.setProperty(oSource._sBindingContextPath + "/FixedValueDate_fc", iValue);
					sTargetPath = oSource._sBindingContextPath + "/FixedValueDate";
				}
				// Value state
				if (iValue === 1) {
					this._removeErrorMsg(aMessageData, sTargetPath);
				}
				return;
			}

			if (sFieldName === "ConditionType") {
				// Clear condition table value
				var sFieldPath = oSource._sBindingContextPath + "/ConditionTable";
				oModel.setProperty(sFieldPath, "");
				// Clear calculation type
				sFieldPath = oSource._sBindingContextPath + "/ConditionCalculationType";
				oModel.setProperty(sFieldPath, "");

			} else if (sFieldName === "ConditionTable") {
				this._buildDynamicalColumn(oSource, vNewValue);
			}
		},

		_buildDynamicalColumn: function (oSource, vNewValue) {
			var oModel = this.getModel();
			var sFieldPath = oSource._sBindingContextPath + "/ConditionRecord";
			var sRecord = oModel.getProperty(sFieldPath);
			if (this.aShowObj.indexOf(sRecord) === -1) {
				this.aShowObj.push(sRecord);
			}

			sFieldPath = oSource._sBindingContextPath + "/ConditionType";
			var sType = oModel.getProperty(sFieldPath);
			if (vNewValue !== "" && sType !== "" && sType !== null) {
				var aTotalTable = [];
				var aTables = [];
				var aTotalType = [];
				var aTypes = [];

				var iTotalCount = this._oTable.getBinding().getLength();
				for (var y = 0; y < iTotalCount; y++) {
					var oContext = this._oTable.getContextByIndex(y);
					if (oContext) {
						var iStart = oContext.sPath.search("IsActiveEntity=") + 15;
						var sIsActive = oContext.sPath.substr(iStart, 4);
						if (sIsActive === "true") {
							break;
						}

						var sPath = oContext.sPath + "/ConditionType";
						var vType = oModel.getProperty(sPath);
						if (vType !== "" && aTypes.indexOf(vType) === -1) {
							var oTypeObj = {
								key: vType
							};
							aTotalType.push(oTypeObj);
							aTypes.push(vType);
						}

						sPath = oContext.sPath + "/ConditionTable";
						var vTable = oModel.getProperty(sPath);
						if (vTable !== "" && aTables.indexOf(vTable) === -1) {
							var oTableObj = {
								key: vTable
							};
							aTotalTable.push(oTableObj);
							aTables.push(vTable);
						}
					} else {
						break;
					}
				}

				this._clearMsg();
				if (aTotalType.length > 0 && aTotalTable.length > 0) {
					this._oBusyModel.setProperty("/isBusy", true);
					this.bTableChange = true;
					this._oDynamicalAreaUtil.setFilterValues([{
						"name": "ConditionType",
						"values": aTotalType
					}, {
						"name": "ConditionTable",
						"values": aTotalTable
					}]);
				}
			}
		},

		_buildCopyData: function (oContext) {
			var oModel = this.getModel();
			var oCopy = Object.assign({}, oModel.getData(oContext.sPath));
			var oNewObj = {};
			for (var z = 0; z < this.aCopyFields.length; z++) {
				if (oCopy[this.aCopyFields[z]] !== undefined) {
					oNewObj[this.aCopyFields[z]] = oCopy[this.aCopyFields[z]];
				}
			}
			oNewObj.ConditionRecord = "";
			oNewObj.ConditionSequentialNumber = "01";
			oNewObj.ConditionQuantityUnit = oCopy.ConditionQuantityUnit;
			oNewObj.ConditionRateValueUnit = oCopy.ConditionRateValueUnit;

			oModel.create("/C_SlsPricingConditionRecordTP", oNewObj, {
				groupId: "batchCopyGroup"
			});
		},

		_prepareDeleteData: function (aSelectObj) {
			var iRequestTotalCount = 0;
			var sRecordUUIDs = "";
			var bDelete;
			var bDeleteSend;
			var aDeleteDraft = [];
			var oModel = this.getModel();
			this.sPopInfo = "";
			for (var x = 0; x < aSelectObj.length; x++) {
				var oContext = this._oTable.getContextByIndex(aSelectObj[x]);
				if (oContext) {
					var oContextData = oModel.getData(oContext.sPath);
					this.iTotalEditableRecords++;
					if (oContextData.Status === "D") {
						// Draft data
						aDeleteDraft.push(oContext.sPath);
						bDeleteSend = true;
					} else if (oContextData.Status === "U") {
						// Active data
						bDelete = true;
						iRequestTotalCount = iRequestTotalCount + 1;
						var iStart = oContext.sPath.search("ConditionRecordUUID=guid'") + 25;
						var sUUID = oContext.sPath.substr(iStart, 36);
						if (sRecordUUIDs === "") {
							sRecordUUIDs = sUUID;
						} else {
							sRecordUUIDs = sRecordUUIDs + "," + sUUID;
						}
						bDeleteSend = true;
					} else {
						this.sPopInfo = "deleteinfomsg";
					}

				} else {
					break;
				}
			}

			// Delete draft data
			for (var z = 0; z < aDeleteDraft.length; z++) {
				oModel.remove(aDeleteDraft[z], {
					groupId: "batchDeleteCondition"
				});
			}

			var oDeleteObj = {};
			oDeleteObj.bDelete = bDelete;
			oDeleteObj.bDeleteSend = bDeleteSend;
			oDeleteObj.sRecordUUIDs = sRecordUUIDs;
			oDeleteObj.iRequestTotalCount = iRequestTotalCount;
			return oDeleteObj;
		},

		_handleResopnseError: function (responseBody) {
			this._oBusyModel.setProperty("/isBusy", false);
			// Add error message to message manager
			var aTakeOverObjs = [];
			var aErrorText = [];
			var oMsgObject = JSON.parse(responseBody);
			var aMsgObject = oMsgObject.error.innererror.errordetails;
			for (var w = 0; w < aMsgObject.length; w++) {
				// Remove framework messages
				if (aMsgObject[w].code === "/IWBEP/CX_MGW_BUSI_EXCEPTION" || aMsgObject[w].code === "LCX_TECH_EXCEPTION") {
					continue;
				}

				var aMessageText = aMsgObject[w].message.split(",");
				if (aMessageText[0] === "Take Over") {
					if (aTakeOverObjs.indexOf(aMessageText[1].substr(0, 10)) === -1) {
						aTakeOverObjs.push(aMessageText[1].substr(0, 10));
					}
				} else if (aMsgObject[w].severity === "error") {
					if (aErrorText.indexOf(aMsgObject[w].message) === -1) {
						aErrorText.push(aMsgObject[w].message);
					}
				}
			}
			if (aErrorText.length > 0) {
				for (w = 0; w < aErrorText.length; w++) {
					this._addMsg(aErrorText[w], MessageType.Error, null, null, aMsgObject[w].longtext_url);
				}
				this._popMsg();
			} else {
				this._draftExist(aTakeOverObjs);
			}
		},

		_prepareMessage: function (sAction, sMsg, aNoAuthorityObj, aInfoText, aInfoType, aSimulationData) {
			var oMsgObject = JSON.parse(sMsg);
			var aMessageText = oMsgObject.message.split(",");
			if (aMessageText[0] === "No Authorization") {
				aNoAuthorityObj.push({
					obj: aMessageText[1],
					text: sAction
				});
				if (sAction === "noEditAuthority") {
					this.aShowObj.push(aMessageText[1]);
				}

			} else {
				var aSimulation = oMsgObject.message.split("SimulateWF:");
				if (aSimulationData !== undefined && aSimulation.length === 2 && aSimulation[0] === "") {
					aSimulationData.push(aSimulation[1]);
				} else if (aInfoText.indexOf(oMsgObject.message) === -1) {
					aInfoText.push(oMsgObject.message);
					aInfoType.push(oMsgObject.severity);
				}

				if (sAction === "noSaveAuthority" && oMsgObject.code === "PRCG_CNDNRECORD_API/015") {
					var sNewRecord = oMsgObject.message.substr(17, 10);
					this.aShowObj.push(sNewRecord);
				}
			}

			for (var z = 0; z < oMsgObject.details.length; z++) {
				aMessageText = oMsgObject.details[z].message.split(",");
				if (aMessageText[0] === "No Authorization") {
					aNoAuthorityObj.push({
						obj: aMessageText[1],
						text: sAction
					});
					if (sAction === "noEditAuthority") {
						this.aShowObj.push(aMessageText[1]);
					}

				} else {
					aSimulation = oMsgObject.details[z].message.split("SimulateWF:");
					if (aSimulationData !== undefined && aSimulation.length === 2 && aSimulation[0] === "") {
						aSimulationData.push(aSimulation[1]);
					} else if (aInfoText.indexOf(oMsgObject.details[z].message) === -1) {
						aInfoText.push(oMsgObject.details[z].message);
						aInfoType.push(oMsgObject.details[z].severity);
					}

					if (sAction === "noSaveAuthority" && oMsgObject.details[z].code === "PRCG_CNDNRECORD_API/015") {
						sNewRecord = oMsgObject.details[z].message.substr(17, 10);
						this.aShowObj.push(sNewRecord);
					}
				}
			}
		},

		_showMessage: function (aNoAuthorityObj, aInfoText, aInfoType, bShowToaster, sMessageText) {
			// Prepare message
			if (aNoAuthorityObj.length > 0) {
				for (var i = 0; i < aNoAuthorityObj.length; i++) {
					var sMsg = this._oResourceBundle.getText(aNoAuthorityObj[i].text, [aNoAuthorityObj[i].obj]);
					this._addMsg(sMsg, MessageType.Information);
				}
			}
			if (aInfoText.length > 0) {
				for (i = 0; i < aInfoText.length; i++) {
					this._addMsg(aInfoText[i], this._setMessageType(aInfoType[i]));
				}
			}
			if (this.sPopInfo !== "") {
				this._addMsg(this._oResourceBundle.getText(this.sPopInfo), MessageType.Information);
			}

			// Pop up message
			var aMessageData = this.oMessageManager.getMessageModel("message").getData();
			if (aMessageData.length > 0) {
				this._popMsg();
			}

			// Message toaster
			if (bShowToaster && this.iTotalEditableRecords !== aNoAuthorityObj.length) {
				if (sMessageText === "saveConditionFailText") {
					sap.m.MessageToast.show(this._oResourceBundle.getText("saveConditionText"));
				} else if (sMessageText === "deleteConditionFail") {
					sap.m.MessageToast.show(this._oResourceBundle.getText("conditionDeletedText"));
				}
			}
		},

		_setDefaultVakey: function (oCreate, ofilter) {
			var oFilterObject = this._oSmartFilterBar.getFilterData()[ofilter];
			if (oFilterObject !== undefined) {
				var aFilterValue = [];
				for (var x = 0; x < oFilterObject.items.length; x++) {
					aFilterValue.push(oFilterObject.items[x]);
				}
				for (var y = 0; y < oFilterObject.ranges.length; y++) {
					if (oFilterObject.ranges[y].operation === "EQ") {
						aFilterValue.push({
							key: oFilterObject.ranges[y].value1,
							text: ""
						});
					} else {
						aFilterValue = [];
						break;
					}
				}

				var aKeyValue = [];
				for (var z in aFilterValue) {
					if (aKeyValue.indexOf(aFilterValue[z].key) === -1) {
						aKeyValue.push(aFilterValue[z].key);
					}
				}
				if (aKeyValue.length === 1) {
					oCreate[ofilter] = aKeyValue[0];
				}
			}
		},

		_downloadErrorHandling: function (oData) {
			for (var m = 0; m < oData.__batchResponses.length; m++) {
				var oResponse = oData.__batchResponses[m].response;
				if (oResponse !== undefined) {
					var oMsgObject = JSON.parse(oResponse.body);
					var sMsg = oMsgObject.error.message.value;
					var aErrorText = [];
					aErrorText.push(sMsg);

					var aMsgObject = oMsgObject.error.innererror.errordetails;
					for (var w = 0; w < aMsgObject.length; w++) {
						if (aErrorText.indexOf(aMsgObject[w].message) === -1) {
							aErrorText.push(aMsgObject[w].message);
						}
					}

					for (w = 0; w < aErrorText.length; w++) {
						this._addMsg(aErrorText[w], MessageType.Error);
					}
					this._popMsg();
				}
			}
		},

		_parseTemplateFilterToString: function (aFilterType, aFilterTable) {
			var sFilterString;

			if (aFilterType.length) {
				sFilterString = this._filterToString(aFilterType, this.getOwnerComponent().getModel()); //"$filter=Material%20eq%20%27%27T003%27%27"
				sFilterString = sFilterString.slice(8); //"Material%20eq%20%27%27T003%27%27"
			}
			if (aFilterTable.length) {
				var sFilterTable = this._filterToString(aFilterTable, this.getOwnerComponent().getModel()); //"$filter=Material%20eq%20%27%27T003%27%27"
				if (sFilterString) {
					sFilterString = "(" + sFilterString + ")" + "%20and%20" + "(" + sFilterTable.slice(8) + ")"; //"Material%20eq%20%27%27T003%27%27"	
				} else {
					sFilterString = sFilterTable.slice(8);
				}
			}
			if (!aFilterType.length && !aFilterTable.length) {
				sFilterString = "";
			}
			return sFilterString;
		},

		_createApproveDialog: function (sButton, iCount, bAll) {
			// Approve Dialog
			var oModel = this.getModel();
			this.oApproveDialog = sap.ui.xmlfragment(this.getView().getId(),
				"zzcus.sd.salesprices.manage.view.Approve", this);
			this.oApproveDialog.setModel(oModel);
			this.getView().addDependent(this.oApproveDialog);
			this._oDescription = this.byId("descriptionInput");
			this._oReason = this.byId("reasonSFI");
			this._oApproveMessageStrip = this.byId("approveMessageStrip");
			this._oApproveMessageStrip.setVisible(false);

			if (sButton === "save") {
				this.byId("skip").setVisible(true);
				var sApprovalRequest = "mulSavedAR";
			} else {
				this.byId("cancelRequest").setVisible(true);
				sApprovalRequest = "mulSelectedAR";
			}
			// Message strip information
			if (bAll === true && iCount > 1) {
				sApprovalRequest = this._oResourceBundle.getText(sApprovalRequest, iCount);
				this._oBusyModel.setProperty("/sApproveInfo", sApprovalRequest);
				this._oApproveMessageStrip.setVisible(true);
			} else if (bAll === false && iCount === 1) {
				this._oBusyModel.setProperty("/sApproveInfo", this._oResourceBundle.getText("mulSomeAR"));
				this._oApproveMessageStrip.setVisible(true);
			} else if (bAll === false && iCount > 1) {
				sApprovalRequest = this._oResourceBundle.getText("mulSomeMoreAR", iCount);
				this._oBusyModel.setProperty("/sApproveInfo", sApprovalRequest);
				this._oApproveMessageStrip.setVisible(true);
			}

			oModel.setDeferredGroups(["doNotSubmit"]);
			this._oReason.setBindingContext(oModel.createEntry("/C_SlsPricingConditionRecordTP", {
				groupId: "doNotSubmit"
			}));
			this._oReason.bindProperty("value", "ConditionChangeReason");
			this.oApproveDialog.open();
			this._oDescription.focus();
		},

		_closeApproveDialog: function () {
			// Reset value state
			this._oDescription.setValue("");
			this._oDescription.setValueState("None");
			this._oDescription.setValueStateText("");

			this.oApproveDialog.close();
			this.oApproveDialog.destroy();
			this.getModel().deleteCreatedEntry();
		},

		_handleFeature: function () {
			sap.s4h.cfnd.featuretoggle.lib.featuresAsync().then(function (features) {
				// if (features.getFeatureStatus("SD_PRICE_APPROVAL_BASIC_FUNCTION") === true) {
				// Feature Toggle is ON
				// this.byId("requestApprove").setVisible(true);
				// this.byId("withdrawApprove").setVisible(true);
				// this.bApproveFeature = true;
				// } else {
				// Feature Toggle is OFF
				// this.byId("requestApprove").setVisible(false);
				// this.byId("withdrawApprove").setVisible(false);
				this.bApproveFeature = false;
				// }
			}.bind(this));
		},

		_buildAQData: function () {
			var oApprovalRequest = {
				bSend: false,
				iRequestTotalCount: 0,
				sRecordUUIDs: "",
				bAll: true
			};

			// Select all button
			var oModel = this.getModel();
			var aSelectObj = [];
			if (this.sSelectAll === "true") {
				var iTotalCount = this._oTable.getBinding().getLength();
				for (var y = 0; y < iTotalCount; y++) {
					aSelectObj.push(y);
				}
			} else {
				aSelectObj = this._oPlugins.getSelectedIndices();
			}

			// Copy creating draft for active data
			for (var x = 0; x < aSelectObj.length; x++) {
				var oContext = this._oTable.getContextByIndex(aSelectObj[x]);
				if (oContext) {
					var oContextData = oModel.getData(oContext.sPath);
					if (oContextData.Status === "U" && oContextData.ConditionReleaseStatus === "A") {
						oApprovalRequest.bSend = true;
						oApprovalRequest.iRequestTotalCount = oApprovalRequest.iRequestTotalCount + 1;
						var iStart = oContext.sPath.search("ConditionRecordUUID=guid'") + 25;
						var sRecordUUID = oContext.sPath.substr(iStart, 36);
						if (oApprovalRequest.sRecordUUIDs === "") {
							oApprovalRequest.sRecordUUIDs = sRecordUUID;
						} else {
							oApprovalRequest.sRecordUUIDs = oApprovalRequest.sRecordUUIDs + "," + sRecordUUID;
						}
					} else {
						// Invalid condition records
						oApprovalRequest.bAll = false;
					}

				} else {
					break;
				}
			}

			return oApprovalRequest;
		},

		_triggerSaveWF: function (aSimulationData) {
			var aRequestCondition = [];
			var aWorkFlow = [];
			for (var i = 0; i < aSimulationData.length; i++) {
				var aSimulationText = aSimulationData[i].split("/");
				if (aSimulationText.length > 1) {
					// ConditionUUID
					if (aRequestCondition.indexOf(aSimulationText[0]) === -1) {
						aRequestCondition.push(aSimulationText[0]);
					}
					// WorkFlowID
					if (aWorkFlow.indexOf(aSimulationText[1]) === -1) {
						aWorkFlow.push(aSimulationText[1]);
					}
				}
			}

			// Call approval dialog
			if (aWorkFlow.length > 0) {
				this.aRequestConditions = aRequestCondition;
				this._createApproveDialog("save", aWorkFlow.length, true);
			}
		},

		_checkSelectedData: function () {
			var oCheckResult = {
				bSend: false,
				bCopy: false,
				bDelete: false
			};

			// Select all button
			var oModel = this.getModel();
			var aSelectObj = [];
			if (this.sSelectAll === "true") {
				var iTotalCount = this._oTable.getBinding().getLength();
				for (var y = 0; y < iTotalCount; y++) {
					aSelectObj.push(y);
				}
			} else {
				aSelectObj = this._oPlugins.getSelectedIndices();
			}

			for (var x = 0; x < aSelectObj.length; x++) {
				var oContext = this._oTable.getContextByIndex(aSelectObj[x]);
				if (oContext) {
					var oContextData = oModel.getData(oContext.sPath);
					if (oContextData.Status === "U") {
						// Copy button
						oCheckResult.bCopy = true;
						// Request Approval button
						if (oContextData.ConditionReleaseStatus === "A") {
							oCheckResult.bSend = true;
						}
					}
					// Delete button
					if (oContextData.ConditionReleaseStatus !== "D" && oContextData.ConditionReleaseStatus !== "F") {
						oCheckResult.bDelete = true;
					}
				} else {
					break;
				}
			}

			return oCheckResult;
		},

		_checkDeleteData: function () {
			var bDeleteAllowed = true;

			// Select all button
			var oModel = this.getModel();
			var aSelectObj = [];
			if (this.sSelectAll === "true") {
				var iTotalCount = this._oTable.getBinding().getLength();
				for (var y = 0; y < iTotalCount; y++) {
					aSelectObj.push(y);
				}
			} else {
				aSelectObj = this._oPlugins.getSelectedIndices();
			}

			for (var x = 0; x < aSelectObj.length; x++) {
				var oContext = this._oTable.getContextByIndex(aSelectObj[x]);
				if (oContext) {
					var oContextData = oModel.getData(oContext.sPath);
					// Delete button
					if (oContextData.ConditionReleaseStatus === "D" || oContextData.ConditionReleaseStatus === "F") {
						bDeleteAllowed = false;
						break;
					}
				} else {
					break;
				}
			}

			return bDeleteAllowed;
		},

		_truncateRateValue: function (oPendRequest, sUrl, sFieldName) {
			var sFieldPath = "/" + sUrl + "/" + sFieldName;
			var aMaxValue = oPendRequest[sFieldName].split(".");
			var bNegative = false;
			if (aMaxValue[0].substr(0, 1) === "-") {
				aMaxValue[0] = aMaxValue[0].substr(1);
				bNegative = true;
			}
			if (aMaxValue.length === 1) {
				var sMaxValue = (aMaxValue[0].length < 11) ? aMaxValue[0].substr(0, 9) : aMaxValue[0].substr(0, 11);
			} else {
				sMaxValue = aMaxValue[0].substr(0, 9) + "." + aMaxValue[1];
			}
			if (bNegative) {
				sMaxValue = "-" + sMaxValue;
			}
			this.getModel().setProperty(sFieldPath, sMaxValue);
		},

		_clearValueState: function (sPath) {
			var aMessageData = this.oMessageManager.getMessageModel("message").getData();
			for (var j in aMessageData) {
				if (aMessageData[j].aTargets[0] !== null) {
					var aPathText = aMessageData[j].aTargets[0].split("/");
					if (aPathText[1] === sPath) {
						this.oMessageManager.removeMessages(aMessageData[j]);
					}
				}
			}
		}

	});
});