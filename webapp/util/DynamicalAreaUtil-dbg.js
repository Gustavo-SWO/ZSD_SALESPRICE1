/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseObject, Filter, FilterOperator) {
	"use strict";
	return BaseObject.extend("zzcus.sd.salesprices.manage..util.DynamicalAreaUtil", {
		/**
		 * variables of the class
		 * @memberOf zzcus.sd.salesprices.manage.util.DynamicalAreaUtil
		 * @public
		 */
		// aDefaultFilters: ["EditingStatus", "FilterMethod", "ConditionType", "ConditionTable", "ConditionRecord", "ValidOnDate",
		// 	"SalesPriceApprovalRequest", "ConditionProcessingStatus", "ConditionReleaseStatus"
		// ],
		aDefaultFilters: ["EditingStatus", "FilterMethod", "ConditionType", "ConditionTable", "ConditionRecord", "ValidOnDate"],
		aDefaultColumns: ["ConditionType", "ConditionTable", "ConditionValidityStartDate", "ConditionValidityEndDate", "ConditionRateValue",
			"ConditionQuantity", "ConditionLowerLimit", "ConditionUpperLimit", "ConditionText", "PaymentTerms", "FixedValueDate", "AdditionalValueDays", "ConditionToBaseQtyNmrtr",
			"ConditionToBaseQtyDnmntr", "BaseUnit", "ConditionCalculationType", "ConditionRecord", "SalesPriceApprovalRequest",
			"ConditionProcessingStatus", "ConditionReleaseStatus", "Status"
		],
		aOptionalFilter: ["ConditionValidityStartDate", "ConditionValidityEndDate"],
		aOtherSelectedFilter: [],
		aKeyFields: [], //key fields
		iKeyFieldsNumber: 0, //Number of key fields, be used in set autoResizeColumn
		aFilters: [], //SmartFilterBar`s filters
		aColumns: [], //SmartTable`s columns
		aKeyFieldsFilters: [], //Filter to filter the key fields
		oDataModel: undefined,
		sEntitySet: undefined,
		aKeyFieldsResult: [],
		aFilterFields: [],
		aKeyFieldsResultOld: [],
		/**
		 * constructor of the class
		 * @memberOf zzcus.sd.salesprices.manage.util.DynamicalAreaUtil
		 * @public
		 * @param {sap.ui.comp.smartfilterbar} oSmartFilterBar - SmartFitlerBar
		 * @param {sap.ui.comp.smarttable} oSmartTable - SmartTable
		 * @param {sap.ui.model.json.JSONModel} oBusyModel - JSONModel
		 */
		constructor: function (oSmartFilterBar, oSmartTable, oBusyModel) {
			this.oSmartFilterBar = oSmartFilterBar;
			this.oNoteListManager = oSmartTable;
			this.oBusyModel = oBusyModel;
			this.aFilters = oSmartFilterBar.getAllFilterItems();
			this.aColumns = oSmartTable.getTable().getColumns();
		},

		/* =========================================================== */
		/* public methods                                              */
		/* =========================================================== */
		getKeyField: function () {
			return this.aFilterFields;
		},

		/**
		 * method to set oData model and EntitySet which used to get dynamical fields
		 * @memberOf zzcus.sd.salesprices.manage.util.DynamicalAreaUtil
		 * @public
		 * @param {sap.ui.model.odata.v2.ODataModel} oDataModel - DataModel
		 * @param {string} sEntitySet - EntitySet
		 */
		setDataSource: function (oDataModel, sEntitySet) {
			this.oDataModel = oDataModel;
			this.sEntitySet = sEntitySet;
		},

		setFilterValues: function (oFilterValues) {
			this.aKeyFieldsFilters = [];
			for (var x in oFilterValues) {
				if (oFilterValues[x]) {
					var aFilters = [];
					if (oFilterValues[x].values instanceof Array) {
						for (var y = 0; y < oFilterValues[x].values.length; y++) {
							aFilters.push(new Filter(oFilterValues[x].name, FilterOperator.EQ, oFilterValues[x].values[y].key));
						}
					} else {
						aFilters.push(new Filter(oFilterValues[x].name, FilterOperator.EQ, oFilterValues[x].values));
					}

					this.aKeyFieldsFilters.push(new Filter({
						filters: aFilters,
						and: false
					}));
				}
			}
		},

		changeDynamicalArea: function (bIsInit, isRebind, isVariant) {
			if (this.aKeyFieldsFilters.length !== 0) {
				this.oDataModel.read(this.sEntitySet, {
					filters: this.aKeyFieldsFilters,
					success: function (oData) {
						//save the information to assemble the filter condition for fetching condition record
						this.aKeyFieldsResult = oData.results;

						this.aKeyFields = [];
						this.aOtherSelectedFilter = [];
						for (var x in oData.results) {
							if (oData.results[x] && this.aKeyFields.indexOf(oData.results[x].ConditionFieldName) === -1) {
								this.aKeyFields.push(oData.results[x].ConditionFieldName);
							}
						}

						if (isVariant) {
							this.aKeyFieldsResultOld = this.aKeyFieldsResult.concat();
							this.aFilterFields = this.aKeyFields.concat();
							this.iKeyFieldsNumber = this.aKeyFields.length;
							if (this.oBusyModel.getProperty("/isBusy")) {
								this.oBusyModel.setProperty("/isBusy", false);
							}
							return;
						}

						// New creating not to trigger smartfilter changing
						this._resetFilterBar(isRebind, bIsInit);

						// Hide Columns
						// this._hideColumn();

						if (bIsInit !== undefined) {
							//only first navigation need automatically serarch
							this.oSmartFilterBar.search();
						}

						if (isRebind) {
							//Rebind Table
							this.oNoteListManager.rebindTable(true);
						}

						if (this.oBusyModel.getProperty("/isBusy")) {
							this.oBusyModel.setProperty("/isBusy", false);
						}
					}.bind(this)
				});

			} else {
				this._initFilterBar(isVariant, bIsInit);
			}
		},

		_resetFilterBar: function (isRebind, bIsInit) {
			if (isRebind === undefined) {
				// clear filter data
				this._resetFilterData(bIsInit);

				this.aKeyFieldsResultOld = this.aKeyFieldsResult.concat();
				this.aFilterFields = this.aKeyFields.concat();
				//GVCA20240301
				var aIgnoreFields = ["ConditionType","Customer","ConditionRecord","SalesOrganization","Plant","ZZKUNZR","ZZ1_KUNZR_PCHF"];
				// sap.ui.getCore().aGlobalKeyFields = this.aKeyFields;
				for (var i in this.aFilters) {
					if (this.aDefaultFilters.indexOf(this.aFilters[i].getName()) !== -1 ||
						this.aKeyFields.indexOf(this.aFilters[i].getName()) !== -1 ||
						this.aOtherSelectedFilter.indexOf(this.aFilters[i].getName()) !== -1) {
						if (aIgnoreFields.indexOf(this.aFilters[i].getName()) === -1) { //GVCA20240301
							this.aFilters[i].setVisibleInAdvancedArea(true);
							continue;
						}
					} else {
						this.aFilters[i].setVisibleInAdvancedArea(false);
					}
				}

			} else {
				// Eg. PPR0 for Type filter, but only 304 in result table(no 305)
				for (i in this.aFilterFields) {
					if (this.aKeyFields.indexOf(this.aFilterFields[i]) === -1) {
						this.aKeyFields.push(this.aFilterFields[i]);
					}
				}
				this.aKeyFieldsResult = this.aKeyFieldsResultOld.concat();
			}

			this.iKeyFieldsNumber = this.aKeyFields.length;
		},

		_resetFilterData: function (bIsInit) {
			var oFilterOld = Object.assign({}, this.oSmartFilterBar.getFilterData());
			if (oFilterOld !== undefined) {
				var oFilterNew = {};

				if (oFilterOld.ConditionRecord !== undefined) {
					oFilterNew.ConditionRecord = oFilterOld.ConditionRecord;
				}
				if (oFilterOld.ValidOnDate !== undefined) {
					oFilterNew.ValidOnDate = oFilterOld.ValidOnDate;
				}
				if (oFilterOld.ConditionType !== undefined) {
					oFilterNew.ConditionType = oFilterOld.ConditionType;
				}
				if (oFilterOld.ConditionTable !== undefined) {
					oFilterNew.ConditionTable = oFilterOld.ConditionTable;
				}

				for (var x in this.aKeyFields) {
					if (oFilterOld[this.aKeyFields[x]] !== undefined) {
						oFilterNew[this.aKeyFields[x]] = oFilterOld[this.aKeyFields[x]];
					}
				}

				for (x in this.aOptionalFilter) {
					if (oFilterOld[this.aOptionalFilter[x]] !== undefined) {
						oFilterNew[this.aOptionalFilter[x]] = oFilterOld[this.aOptionalFilter[x]];
						this.aOtherSelectedFilter.push(this.aOptionalFilter[x]);
					}
				}

				if (bIsInit === undefined) {
					this.oSmartFilterBar._resetFilterFields();
					this.oSmartFilterBar.setFilterData(oFilterNew);
				}
			}
		},

		_hideColumn: function () {
			var aFieldNames = [];
			var sFieldName = "";
			var bFound = false;
			for (var m = 0; m < this.aColumns.length; m++) {
				aFieldNames = this.aColumns[m].getId().split("-");
				sFieldName = aFieldNames[aFieldNames.length - 1];
				for (var k in this.aDefaultColumns) {
					if ((sFieldName === this.aDefaultColumns[k])) {
						this.aColumns[m].setVisible(true);
						bFound = true;
						break;
					} else {
						bFound = false;
					}
				}
				if (bFound) {
					continue;
				}

				this.aColumns[m].setVisible(false);
				for (var n in this.aKeyFields) {
					if (sFieldName === this.aKeyFields[n]) {
						this.aColumns[m].setVisible(true);
						bFound = true;
					}
				}
			}
		},

		_initFilterBar: function (isVariant, bIsInit) {
			this.aFilterFields = [];
			this.aKeyFieldsResult = [];
			this.iKeyFieldsNumber = 0;

			if (isVariant) {
				if (this.oBusyModel.getProperty("/isBusy")) {
					this.oBusyModel.setProperty("/isBusy", false);
				}
				return;
			}

			for (var e in this.aFilters) {
				if (this.aFilters[e] && (this.aDefaultFilters.indexOf(this.aFilters[e].getName()) !== -1)) {
					this.aFilters[e].setVisibleInAdvancedArea(true);
					continue;
				} else {
					this.aFilters[e].setVisibleInAdvancedArea(false);
				}
			}

			for (var f in this.aColumns) {
				if (this.aColumns[f]) {
					this.aColumns[f].setVisible(true);
				}
			}

			if (bIsInit !== undefined) {
				if (this.oBusyModel.getProperty("/isBusy")) {
					this.oBusyModel.setProperty("/isBusy", false);
				}
				this.oSmartFilterBar.search();
				return;
			}

			var oFilterOld = Object.assign({}, this.oSmartFilterBar.getFilterData());
			if (oFilterOld !== undefined) {
				var oFilterNew = {};

				if (oFilterOld.ConditionRecord !== undefined) {
					oFilterNew.ConditionRecord = oFilterOld.ConditionRecord;
				}
				if (oFilterOld.ValidOnDate !== undefined) {
					oFilterNew.ValidOnDate = oFilterOld.ValidOnDate;
				}

				this.oSmartFilterBar._resetFilterFields();
				this.oSmartFilterBar.setFilterData(oFilterNew);
			}

			if (this.oBusyModel.getProperty("/isBusy")) {
				this.oBusyModel.setProperty("/isBusy", false);
			}
		}

	});
});