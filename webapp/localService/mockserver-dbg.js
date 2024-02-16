/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/thirdparty/jquery",
	"sap/ui/core/util/MockServer",
	"sap/ui/model/json/JSONModel",
	"sap/base/util/UriParameters",
	"sap/base/Log"
], function (jQuery, MockServer, JSONModel, UriParameters, Log) {
	"use strict";

	var oMockServer,
		_sAppPath = "cus/sd/salesprices/manage/",
		_sJsonFilesPath = _sAppPath + "localService/mockdata";

	var oMockServerInterface = {

		/**
		 * Initializes the mock server asynchronously.
		 * You can configure the delay with the URL parameter "serverDelay".
		 * The local mock data in this folder is returned instead of the real data for testing.
		 * @protected
		 * @param {object} [oOptionsParameter] init parameters for the mockserver
		 * @returns{Promise} a promise that is resolved when the mock server has been started
		 */
		init: function (oOptionsParameter) {
			var oOptions = oOptionsParameter || {};

			return new Promise(function (fnResolve, fnReject) {
				var sManifestUrl = sap.ui.require.toUrl(_sAppPath + "manifest.json"),
					oManifestModel = new JSONModel(sManifestUrl);
				oManifestModel.attachRequestCompleted(function () {
					var oUriParameters = new UriParameters(window.location.href),
						// parse manifest for local metatadata URI
						sJsonFilesUrl = sap.ui.require.toUrl(_sJsonFilesPath),
						oDataSource = oManifestModel.getProperty("/sap.app/dataSources"),
						oMainDataSource = oManifestModel.getProperty("/sap.app/dataSources/mainService"),
						aAnnotations = oMainDataSource.settings.annotations,
						sMetadataUrl = sap.ui.require.toUrl(_sAppPath + oMainDataSource.settings.localUri),
						// ensure there is a trailing slash
						sMockServerUrl = /.*\/$/.test(oMainDataSource.uri) ? oMainDataSource.uri : oMainDataSource.uri + "/",
						iCndnRecdNumber = 20;

					// create a mock server instance or stop the existing one to reinitialize
					if (!oMockServer) {
						oMockServer = new MockServer({
							rootUri: sMockServerUrl
						});
					} else {
						oMockServer.stop();
					}

					// configure mock server with the given options or a default delay of 0.5s
					MockServer.config({
						autoRespond: true,
						autoRespondAfter: (oOptions.delay || oUriParameters.get("serverDelay") || 500)
					});

					// simulate all requests using mock data
					oMockServer.simulate(sMetadataUrl, {
						sMockdataBaseUrl: sJsonFilesUrl,
						bGenerateMissingMockData: true
					});

					var aRequests = oMockServer.getRequests();

					// compose an error response for each request
					var fnResponse = function (iErrCode, sMessage, aRequest) {
						aRequest.response = function (oXhr) {
							oXhr.respond(iErrCode, {
								"Content-Type": "text/plain;charset=utf-8"
							}, sMessage);
						};
					};

					// simulate metadata errors
					if (oOptions.metadataError || oUriParameters.get("metadataError")) {
						aRequests.forEach(function (aEntry) {
							if (aEntry.path.toString().indexOf("$metadata") > -1) {
								fnResponse(500, "metadata Error", aEntry);
							}
						});
					}

					// simulate request errors
					var sErrorParam = oOptions.errorType || oUriParameters.get("errorType"),
						iErrorCode = sErrorParam === "badRequest" ? 400 : 500;
					if (sErrorParam) {
						aRequests.forEach(function (aEntry) {
							fnResponse(iErrorCode, sErrorParam, aEntry);
						});
					}

					// custom mock behaviour may be added here
					//handling mocking function import C_SlsPricingConditionRecordTPActivation calls step
					aRequests.push({
						method: "POST",
						path: new RegExp("C_SlsPricingConditionRecordTPActivation(.*)"),
						response: function (oXhr, sUrlParams) {
							var iConditionRecordUUID = sUrlParams.search("guid") + 4;
							var sCondtiionRecordUUID = sUrlParams.substr(iConditionRecordUUID, 38);
							var iIsActiveEntity = sUrlParams.search("IsActiveEntity=") + 15;
							var sIsActiveEntity = sUrlParams.substr(iIsActiveEntity, 5);
							var aFilter = [];
							aFilter.push("ConditionRecordUUID eq " + sCondtiionRecordUUID);
							aFilter.push("IsActiveEntity eq " + sIsActiveEntity);
							var oResponse = jQuery.sap.sjax({
								url: "/sap/opu/odata/sap/SD_PRICING_CONDITIONRECORD_SRV/C_SlsPricingConditionRecordTP?$filter=" + aFilter.join(" and "),
								dataType: "json"
							});
							if (!oResponse.success || !oResponse.data.d.results[0]) {
								// respond negative - no entity found
								oXhr.respond(404);
								return false;
							}
							var oEntry = oResponse.data.d.results[0];
							if (oEntry.IsActiveEntity) {
								// respond negative - trying to activate an already active entity
								oXhr.respond(400);
								return false;
							}
							if (oEntry.HasActiveEntity) {
								// edit draft activiation --> delete active sibling
								var oSiblingEntityUri = oEntry.SiblingEntity.__deferred.uri;
								oResponse = jQuery.sap.sjax({
									url: oSiblingEntityUri,
									dataType: "json"
								});
								if (oResponse.success && oResponse.data && oResponse.data.d.__metadata) {
									var oSibling = oResponse.data.d;
									oResponse = jQuery.sap.sjax({
										url: oSibling.__metadata.uri,
										type: "DELETE"
									});
								}
							}
							if (oEntry.ConditionTable === "") {
								oXhr.respondJSON(400, {},
									JSON.stringify({
										error: {
											"code": "PRCG_CNDNRECORD_API/020",
											"message": {
												"lang": "en",
												"value": "Condition record $10502218: Property \"Condition Table\" is required."
											},
											"innererror": {
												"errordetails": [{
													"code": "PRCG_CNDNRECORD_API/020",
													"message": "Condition record $10502218: Property \"Condition Table\" is required.",
													"propertyref": "",
													"severity": "error",
													"transition": true,
													"target": ""
												}]
											}
										}
									}));
								return false;
							}
							oEntry.IsActiveEntity = true;
							oEntry.HasActiveEntity = false;
							oEntry.HasDraftEntity = false;
							oEntry.ConditionQuantity_fc = 1; // ?need verify
							oEntry.ConditionQuantityUnit_fc = 1; //
							oEntry.ConditionRateValue_fc = 1; //
							oEntry.ConditionRateValueUnit_fc = 1; //
							oEntry.ConditionRecord = oEntry.ConditionRecordUUID.substr(0, 8) + oEntry.ConditionRecordUUID.substr(9, 2); //
							oEntry.ConditionRecordIsDraft = false;
							oEntry.Status = "U";
							oResponse = jQuery.sap.sjax({
								url: oEntry.__metadata.uri,
								type: "PATCH",
								data: JSON.stringify(oEntry)
							});
							if (!oResponse.success) {
								// respond negative - trying to activate an already active entity
								oXhr.respond(404);
								return false;
							}
							oXhr.respondJSON(200, {
									"sap-message": '{"code":"PRCG_CNDNRECORD_API/016","message":"Validity period of condition record 0000193713 is changed and is from 27.06.2017 to 27.06.2019.","severity":"info","target":"","transition":true,"details":[{"code":"PRCG_CNDNRECORD_API/015","message":"Condition record bdcf2d0f04 (temp. No. $00000021) is created and valid from 28.06.2019 to 31.12.9999.","target":"","severity":"info","transition":true},{"code":"PRCG_CNDNRECORD_API/014","message":"Condition record bdcf2d0f04 overlaps with condition record 0000193713.","target":"","severity":"info","transition":true},{"code":"00/000","message":"SimulateWF:00006046580100000000000000000000/506B4BC345CC1EEB96DF58C9655878E5","target":"","severity":"info","transition":true}]}'
								},
								JSON.stringify({
									d: oEntry
								}));
							Log.debug("MockServer: response sent with: " + 200);
							return true;
						}
					});

					//handling mocking function import C_SlsPricingConditionRecordTPSimulate calls step
					aRequests.push({
						method: "POST",
						path: new RegExp("C_SlsPricingConditionRecordTPSimulate(.*)"),
						response: function (oXhr, sUrlParams) {
							var oEntry = {
								"d": {
									"C_SlsPricingConditionRecordTPSimulate": {
										"__metadata": {
											"type": "SD_PRICING_CONDITIONRECORD_SRV.DummyFunctionImportResult"
										},
										"IsInvalid": false
									}
								}
							};
							var sMessage =
								"{\"code\":\"00/001\",\"message\":\"00006046590120011231/506B4BC345CC1EEB96DF58C9655878E5\",\"target\":\"(ConditionRecordUUID=guid'00006046-5901-2001-1231-000000000000',IsActiveEntity=false)\",\"severity\":\"info\",\"transition\":true,\"details\":[{\"code\":\"00/001\",\"message\":\"00006046690120021231/506B4BC345CC1EEB96DF58C9655878E5\",\"target\":\"(ConditionRecordUUID=guid'00006046-6901-2002-1231-000000000000',IsActiveEntity=false)\",\"severity\":\"info\",\"transition\":true}]}";
							oXhr.respondJSON(200, {
									"sap-message": sMessage
								},
								JSON.stringify({
									d: oEntry
								}));
							Log.debug("MockServer: response sent with: " + 200);
							return true;
						}
					});

					//handling mocking function import AE3B72B4F1AA3073D427A3Requestforapproval calls step
					aRequests.push({
						method: "POST",
						path: new RegExp("AE3B72B4F1AA3073D427A3Requestforapproval(.*)"),
						response: function (oXhr, sUrlParams) {
							var oEntry = {
								"d": {
									"AE3B72B4F1AA3073D427A3Requestforapproval": {
										"__metadata": {
											"type": "SD_PRICING_CONDITIONRECORD_SRV.DummyFunctionImportResult"
										},
										"IsInvalid": false
									}
								}
							};
							var sMessage =
								"{\"code\":\"00/001\",\"message\":\"0000604669\",\"severity\":\"info\",\"transition\":true,\"details\":[]}";
							oXhr.respondJSON(200, {
									"sap-message": sMessage
								},
								JSON.stringify({
									d: oEntry
								}));
							Log.debug("MockServer: response sent with: " + 200);
							return true;
						}
					});

					//handling mocking function import AE3B72B4F1AA3073D42Deleteconditionrecord calls step
					aRequests.push({
						method: "POST",
						path: new RegExp("AE3B72B4F1AA3073D42Deleteconditionrecord(.*)"),
						response: function (oXhr, sUrlParams) {
							var iTotalCountPos = sUrlParams.search("Totalcount=") + 11;
							var iTotalCount = parseInt(sUrlParams.substr(iTotalCountPos), 10);
							var iConditionRecordUUIDPos = sUrlParams.search("ConditionRecordUUID=") + 21;
							var iIsActiveEntityPos = sUrlParams.search("IsActiveEntity=") + 15;
							var sIsActiveEntity = sUrlParams.substr(iIsActiveEntityPos, 4);
							for (var x = 0; x < iTotalCount; x++) {
								var sConditionRecordUUID = sUrlParams.substr(iConditionRecordUUIDPos, 36);
								sConditionRecordUUID = "'" + sConditionRecordUUID + "'";
								var aFilter = [];
								aFilter.push("ConditionRecordUUID eq " + sConditionRecordUUID);
								aFilter.push("IsActiveEntity eq " + sIsActiveEntity);
								var oResponse = jQuery.sap.sjax({
									url: "/sap/opu/odata/sap/SD_PRICING_CONDITIONRECORD_SRV/C_SlsPricingConditionRecordTP(ConditionRecordUUID=guid" +
										sConditionRecordUUID + ",IsActiveEntity=" + sIsActiveEntity + ")",
									type: "DELETE"
								});
								if (!oResponse.success) {
									// respond negative 
									oXhr.respond(400);
									return false;
								}
								var oEntry = {
									"d": {
										"AE3B72B4F1AA3073D42Deleteconditionrecord": {
											"__metadata": {
												"type": "SD_PRICING_CONDITIONRECORD_SRV.DummyFunctionImportResult"
											},
											"IsInvalid": false
										}
									}
								};
								iConditionRecordUUIDPos += 39;
							}

							oXhr.respondJSON(200, {}, JSON.stringify({
								d: oEntry
							}));
							Log.debug("MockServer: response sent with: " + 200);
							return true;
						}
					});
					//handling mocking function import AE3B72B4F1AA3073D427AEditconditionrecord calls step
					aRequests.push({
						method: "POST",
						path: new RegExp("AE3B72B4F1AA3073D427AEditconditionrecord(.*)"),
						response: function (oXhr, sUrlParams) {
							var iTotalCountPos = sUrlParams.search("Totalcount=") + 11;
							var iTotalCount = parseInt(sUrlParams.substr(iTotalCountPos), 10);
							var iConditionRecordUUIDPos = sUrlParams.search("ConditionRecordUUID=") + 21;
							var iIsActiveEntityPos = sUrlParams.search("IsActiveEntity=") + 15;
							var sIsActiveEntity = sUrlParams.substr(iIsActiveEntityPos, 4);
							for (var x = 0; x < iTotalCount; x++) {
								var sConditionRecordUUID = sUrlParams.substr(iConditionRecordUUIDPos, 36);
								sConditionRecordUUID = "'" + sConditionRecordUUID + "'";
								var aFilter = [];
								aFilter.push("ConditionRecordUUID eq " + sConditionRecordUUID);
								aFilter.push("IsActiveEntity eq " + sIsActiveEntity);
								var oResponse = jQuery.sap.sjax({
									url: "/sap/opu/odata/sap/SD_PRICING_CONDITIONRECORD_SRV/C_SlsPricingConditionRecordTP?$filter=" + aFilter.join(
										" and "),
									dataType: "json"
								});
								if (!oResponse.success || !oResponse.data.d.results[0]) {
									// respond negative - no entity found
									oXhr.respond(404);
									return false;
								}
								var oEntry = oResponse.data.d.results[0];
								if (!oEntry.IsActiveEntity) {
									// respond negative - trying to activate an already active entity
									oXhr.respond(400);
									return false;
								}
								oEntry.IsActiveEntity = false;
								oEntry.ConditionQuantity_fc = 3; // ?need verify
								oEntry.ConditionQuantityUnit_fc = 3; //
								oEntry.ConditionRateValue_fc = 3; //
								oEntry.ConditionRateValueUnit_fc = 3; //
								oEntry.ConditionRecordIsDraft = true;
								oEntry.Status = "D";
								var sEntityuri = oEntry.__metadata.uri;
								oEntry.__metadata.id = oEntry.__metadata.id.replace("true", "false");
								oEntry.__metadata.uri = oEntry.__metadata.uri.replace("true", "false");
								oResponse = jQuery.sap.sjax({
									url: sEntityuri,
									type: "PATCH",
									data: JSON.stringify(oEntry)
								});
								if (!oResponse.success) {
									// respond negative - trying to activate an already active entity
									oXhr.respond(404);
									return false;
								}
								iConditionRecordUUIDPos += 39;
							}
							oEntry = {
								"d": {
									"AE3B72B4F1AA3073D427AEditconditionrecord": {
										"__metadata": {
											"type": "SD_PRICING_CONDITIONRECORD_SRV.DummyFunctionImportResult"
										},
										"IsInvalid": false
									}
								}
							};
							oXhr.respondJSON(200, {}, JSON.stringify({
								d: oEntry
							}));
							Log.debug("MockServer: response sent with: " + 200);
							return true;
						}
					});

					// set requests 
					oMockServer.setRequests(aRequests);

					var fnCreateCndnRecdNumber = function (num, a) {
						var iLengthOfA = a.toString().length;
						var aCndnRecdNumber = new Array();
						for (var i = 0; i < num - iLengthOfA; i++) {
							aCndnRecdNumber[i] = 0;
						}
						var sCndnRecdNumber = "$" + aCndnRecdNumber.join("");
						return sCndnRecdNumber;
					};

					//handling post C_SlsPricingConditionRecordTP step
					var fnPostAfter = function (oEvent) {
						iCndnRecdNumber += 1;
						oEvent.getParameter("oEntity").ConditionRecord = fnCreateCndnRecdNumber(8, iCndnRecdNumber) + iCndnRecdNumber;
						oEvent.getParameter("oEntity").ConditionRecordIsDraft = true; //?need verify
						oEvent.getParameter("oEntity").Status = "D";
						var oCurrentDate = new Date();
						var sDateTimeString = oCurrentDate.toLocaleDateString() + " 08:00:00";
						oEvent.getParameter("oEntity").DraftEntityCreationDateTime = "/Date(" + +new Date() + ")/";
						oEvent.getParameter("oEntity").DraftEntityLastChangeDateTime = "/Date(" + +new Date() + ")/";
						oEvent.getParameter("oEntity").CreationDate = "/Date(" + +new Date(sDateTimeString) + ")/";
						if (oEvent.getParameter("oEntity").SiblingEntity.__deferred.uri.search("true") !== -1) {
							oEvent.getParameter("oEntity").SiblingEntity.__deferred.uri = oEvent.getParameter("oEntity").SiblingEntity.__deferred.uri.replace(
								"true", "false");
						}
						if (oEvent.getParameter("oEntity").__metadata.id.search("true") !== -1) {
							oEvent.getParameter("oEntity").__metadata.id = oEvent.getParameter("oEntity").__metadata.id.replace("true", "false");
						}
						if (oEvent.getParameter("oEntity").__metadata.uri.search("true") !== -1) {
							oEvent.getParameter("oEntity").__metadata.uri = oEvent.getParameter("oEntity").__metadata.uri.replace("true", "false");
						}
						var oMockEntity = {
							AccessNumberOfAccessSequence: "000",
							AccountTaxType: "",
							AccountTaxType_fc: 3,
							Activation_ac: true,
							ActiveUUID: "00000000-0000-0000-0000-000000000000",
							AdditionalMaterialGroup1: "",
							AdditionalMaterialGroup1_fc: 3,
							AdditionalMaterialGroup2: "",
							AdditionalMaterialGroup2_fc: 3,
							AdditionalMaterialGroup3: "",
							AdditionalMaterialGroup3_fc: 3,
							AdditionalMaterialGroup4: "",
							AdditionalMaterialGroup4_fc: 3,
							AdditionalMaterialGroup5: "",
							AdditionalMaterialGroup5_fc: 3,
							AdditionalValueDays: "00",
							BRSpcfcFreeDefinedField1: "",
							BRSpcfcFreeDefinedField1_fc: 3,
							BRSpcfcFreeDefinedField2: "",
							BRSpcfcFreeDefinedField2_fc: 3,
							BRSpcfcFreeDefinedField3: "",
							BRSpcfcFreeDefinedField3_fc: 3,
							BRSpcfcTaxBasePercentageCode: "0",
							BRSpcfcTaxBasePercentageCode_fc: 3,
							BRSpcfcTaxDepartureRegion: "",
							BRSpcfcTaxDepartureRegion_fc: 3,
							BRSpcfcTaxDestinationRegion: "",
							BRSpcfcTaxDestinationRegion_fc: 3,
							BRSpcfcTxGrpDynTaxExceptions: "00",
							BRSpcfcTxGrpDynTaxExceptions_fc: 3,
							BR_NFDocumentType: "",
							BR_NFDocumentType_fc: 3,
							BR_TaxCode: "",
							BR_TaxCode_fc: 3,
							BaseUnit: "",
							BillableControl: "",
							BillableControl_fc: 3,
							CityCode: "",
							CityCode_fc: 3,
							CndnMaxNumberOfSalesOrders: "00",
							CommodityCode: "",
							CommodityCode_fc: 3,
							ConditionAlternativeCurrency: "",
							ConditionApplication: "V",
							ConditionCalculationType: "",
							ConditionCalculationType_fc: 3,
							ConditionContract: "",
							ConditionContract_fc: 3,
							ConditionExclusion: "",
							ConditionIsDeleted: false,
							ConditionIsExclusive: false,
							ConditionIsExclusive_fc: 3,
							ConditionLowerLimit: "0.000",
							ConditionProcessingStatus: "",
							ConditionProcessingStatus_fc: 3,
							ConditionQuantity: "0",
							ConditionQuantityUnit: "",
							ConditionQuantityUnit_fc: 3,
							ConditionQuantity_fc: 3,
							ConditionRateValue: "0.00",
							ConditionRateValueUnit: "",
							ConditionRateValueUnit_fc: 3,
							ConditionRateValue_fc: 3,
							ConditionRecordIsEditable: false,
							ConditionReleaseStatus: "",
							ConditionReleaseStatus_fc: 1,
							ConditionScaleAmount: "0.000",
							ConditionScaleAmountCurrency: "",
							ConditionScaleBasisValue: "0000000",
							ConditionScaleBasisValue_fc: 3,
							ConditionScaleQuantity: "0.000",
							ConditionScaleQuantityUnit: "",
							ConditionTable: "",
							ConditionTable_fc: 3,
							ConditionTextID: "",
							ConditionToBaseQtyDnmntr: "0",
							ConditionToBaseQtyNmrtr: "0",
							ConditionType: "",
							ConditionType_fc: 3,
							ConditionUpperLimit: "0.000",
							ConditionValidityEndDate_fc: 3,
							ConditionValidityStartDate_fc: 3,
							ConfigurationNumber: "000000000000000000",
							ConfigurationNumber_fc: 3,
							ConsumptionTaxCtrlCode: "",
							ConsumptionTaxCtrlCode_fc: 3,
							County: "",
							County_fc: 3,
							CreatedByUser: "RONGF",
							Customer: "",
							CustomerGroup: "",
							CustomerGroup_fc: 3,
							CustomerHierarchy: "",
							CustomerHierarchy_fc: 3,
							CustomerName: "",
							CustomerPriceGroup: "",
							CustomerPriceGroup_fc: 3,
							CustomerTaxClassification1: "",
							CustomerTaxClassification1_fc: 3,
							CustomerTaxClassification2: "",
							CustomerTaxClassification2_fc: 3,
							CustomerTaxClassification3: "",
							CustomerTaxClassification3_fc: 3,
							CustomerTaxClassification4: "",
							CustomerTaxClassification4_fc: 3,
							Customer_fc: 3,
							DepartureCountry: "",
							DepartureCountry_fc: 3,
							DestinationCountry: "",
							DestinationCountry_fc: 3,
							DistributionChannel: "",
							DistributionChannelName: "",
							DistributionChannel_fc: 3,
							Division: "",
							Division_fc: 3,
							ETag: "",
							Edit_ac: false,
							EngagementProject: "",
							EngagementProjectName: "",
							EngagementProjectServiceOrg: "",
							EngagementProjectServiceOrg_fc: 3,
							EngagementProject_fc: 3,
							EngmtProjectServiceOrgName: "",
							Equipment: "",
							Equipment_fc: 3,
							FixedValueDate: null,
							IncotermsClassification: "",
							IncotermsClassification_fc: 3,
							IncotermsTransferLocation: "",
							IncotermsTransferLocation_fc: 3,
							IncrementalScale: "0000",
							Industry: "",
							Industry_fc: 3,
							InternationalArticleNumber: "",
							InternationalArticleNumber_fc: 3,
							LocalSalesTaxApplicabilityCode: "",
							LocalSalesTaxApplicabilityCode_fc: 3,
							MainItemMaterialPricingGroup: "",
							MainItemMaterialPricingGroup_fc: 3,
							MainItemPricingRefMaterial: "",
							MainItemPricingRefMaterial_fc: 3,
							Material: "",
							MaterialGroup: "",
							MaterialGroup_fc: 3,
							MaterialName: "",
							MaterialPricingGroup: "",
							MaterialPricingGroup_fc: 3,
							Material_fc: 3,
							MaximumConditionAmount: "0.000",
							MaximumConditionBasisValue: "0.000",
							MinimumConditionBasisValue: "0.000",
							OrderQuantityUnit: "",
							OrderQuantityUnit_fc: 3,
							PayerParty: "",
							PayerParty_fc: 3,
							PaymentTerms: "",
							PersonFullName: "",
							Personnel: "00000000",
							Personnel_fc: 3,
							Plant: "",
							PlantRegion: "",
							PlantRegion_fc: 3,
							Plant_fc: 3,
							PostalCode: "",
							PostalCode_fc: 3,
							Preparation_ac: true,
							PriceListType: "",
							PriceListType_fc: 3,
							PricingDate: null,
							PricingDate_fc: 3,
							PricingScaleBasis: "",
							PricingScaleLine: "0000",
							PricingScaleType: "",
							ProductTaxClassification1: "",
							ProductTaxClassification1_fc: 3,
							ProductTaxClassification2: "",
							ProductTaxClassification2_fc: 3,
							ProductTaxClassification3: "",
							ProductTaxClassification3_fc: 3,
							ProductTaxClassification4: "",
							ProductTaxClassification4_fc: 3,
							ReferenceSDDocument: "",
							ReferenceSDDocumentItem: "000000",
							ReferenceSDDocumentItem_fc: 3,
							ReferenceSDDocument_fc: 3,
							Region: "",
							Region_fc: 3,
							RequirementSegment: "",
							RequirementSegment_fc: 3,
							ReturnsRefundExtent: "",
							ReturnsRefundExtent_fc: 3,
							SDDocument: "",
							SDDocument_fc: 3,
							SalesDocument: "",
							SalesDocumentItem: "000000",
							SalesDocumentItem_fc: 3,
							SalesDocument_fc: 3,
							SalesGroup: "",
							SalesGroup_fc: 3,
							SalesOffice: "",
							SalesOffice_fc: 3,
							SalesOrderSalesOrganization: "",
							SalesOrderSalesOrganization_fc: 3,
							SalesOrganization: "",
							SalesOrganizationName: "",
							SalesOrganization_fc: 3,
							SalesSDDocumentCategory: "",
							SalesSDDocumentCategory_fc: 3,
							ServiceDocument: "",
							ServiceDocumentItem: "000000",
							ServiceDocumentItem_fc: 3,
							ServiceDocument_fc: 3,
							ShipToParty: "",
							ShipToParty_fc: 3,
							SoldToParty: "",
							SoldToParty_fc: 3,
							StockSegment: "",
							StockSegment_fc: 3,
							Supplier: "",
							Supplier_fc: 3,
							TaxCode: "",
							TaxCode_fc: 3,
							TaxJurisdiction: "",
							TaxJurisdiction_fc: 3,
							TechnicalObjectType: "",
							TechnicalObjectType_fc: 3,
							TimeSheetOvertimeCategory: "",
							TimeSheetOvertimeCategory_fc: 3,
							TradingContract: "",
							TradingContractItem: "000000",
							TradingContractItem_fc: 3,
							TradingContract_fc: 3,
							TransactionCurrency: "",
							TransactionCurrency_fc: 3,
							TxRlvnceClassfctnForArgentina: "",
							TxRlvnceClassfctnForArgentina_fc: 3,
							ValidOnDate: null,
							Validation_ac: true,
							ValueAddedServiceChargeCode: "",
							ValueAddedServiceChargeCode_fc: 3,
							VariantCondition: "",
							VariantCondition_fc: 3,
							WBSDescription: "",
							WBSElementInternalID: "",
							WBSElementInternalID_fc: 3,
							WorkItem: "",
							WorkItemName: "",
							WorkItem_fc: 3,
							WorkPackage: "",
							WorkPackageName: "",
							WorkPackage_fc: 3,
							ReturnReason: "",
							Status: "D",
							ReturnReason_fc: 3,
							ConditionToBaseQtyNmrtr_fc: 3,
							ConditionToBaseQtyDnmntr_fc: 3,
							BaseUnit_fc: 3,
							ConditionTypeName: "",
							ConditionCalculationTypeName: "",
							DepartureCountryName: "",
							SalesDocumentItemText: "",
							BillableControlName: "",
							IndustryKeyText: "",
							CityCodeName: "",
							CountyName: "",
							TechnicalObjectTypeDesc: "",
							EquipmentName: "",
							IncotermsClassificationName: "",
							CustomerGroupName: "",
							CustomerPriceGroupName: "",
							SoldToPartyName: "",
							PayerPartyName: "",
							ShipToPartyName: "",
							SupplierName: "",
							DestinationCountryName: "",
							MaterialGroupName: "",
							ReturnsRefundExtentDesc: "",
							AdditionalMaterialGroup1Name: "",
							AdditionalMaterialGroup2Name: "",
							AdditionalMaterialGroup3Name: "",
							AdditionalMaterialGroup4Name: "",
							AdditionalMaterialGroup5Name: "",
							PriceListTypeName: "",
							RegionName: "",
							TimeSheetOvertimeCategoryText: "",
							CommodityCodeText: "",
							TaxJurisdictionName: "",
							MaterialPricingGroupName: "",
							VariantConditionName: "",
							SalesOfficeName: "",
							SalesGroupName: "",
							TransactionCurrencyName: "",
							PlantName: "",
							SDDocumentCategoryName: "",
							DivisionName: "",
							SlsOrderSalesOrganizationName: "",
							OrderQuantityUnitName: "",
							PlantRegionName: "",
							MainItmMatlPricingGroupName: "",
							MainItemPricingRefMaterialName: "",
							ProductHierarchyNode: "",
							ProductHierarchyNode_fc: 3,
							ProductHierarchyNodeText: "",
							ShippingType: "",
							ShippingType_fc: 3,
							ShippingTypeName: "",
							CustomerConditionGroup: "",
							CustomerConditionGroup_fc: 3,
							ConditionText: "",
							ConditionText_fc: 3,
							PaymentTerms_fc: 3,
							PaymentTermsName: "",
							FixedValueDate_fc: 3,
							AdditionalValueDays_fc: 3,
							SalesPriceApprovalRequest: ""
						};
						var aPropertiesInoMockEntity = Object.getOwnPropertyNames(oMockEntity);
						for (var x in aPropertiesInoMockEntity) {
							if (!oEvent.getParameter("oEntity").hasOwnProperty(aPropertiesInoMockEntity[x])) {
								oEvent.getParameter("oEntity")[aPropertiesInoMockEntity[x]] = oMockEntity[aPropertiesInoMockEntity[x]];
							}
						}
						if (!oEvent.getParameter("oEntity").hasOwnProperty("ConditionValidityEndDate")) {
							oEvent.getParameter("oEntity").ConditionValidityEndDate = "/Date(" + +new Date("Dec 31 9999 08:00:00") + ")/";
						}
						if (!oEvent.getParameter("oEntity").hasOwnProperty("ConditionValidityStartDate")) {
							oEvent.getParameter("oEntity").ConditionValidityStartDate = "/Date(" + +new Date(sDateTimeString) + ")/";
						}
					};
					oMockServer.attachAfter("POST", fnPostAfter, "C_SlsPricingConditionRecordTP");
					//handling merge C_SlsPricingConditionRecordTP step
					var fnMergeAfter = function (oEvent) {
						if (oEvent.getParameter("oEntity").IsActiveEntity === false || oEvent.getParameter("oEntity").IsActiveEntity.search("false") !==
							-1) {
							oEvent.getParameter("oEntity").IsActiveEntity = false;
						} else if (oEvent.getParameter("oEntity").IsActiveEntity === true || oEvent.getParameter("oEntity").IsActiveEntity.search(
								"true") !== -1) {
							oEvent.getParameter("oEntity").IsActiveEntity = true;
						}
						if (oEvent.getParameter("oEntity").ConditionTable === undefined) {
							oEvent.getParameter("oEntity").SalesOrganization = "0001";
							oEvent.getParameter("oEntity").DistributionChannel = "01";
							oEvent.getParameter("oEntity").Material = "T001";
							oEvent.getParameter("oEntity").Personnel = "00000001";
							oEvent.getParameter("oEntity").WorkPackage = "RELIMPLEMENTSAP.1.4";
							oEvent.getParameter("oEntity").WorkItem = "P002";
							oEvent.getParameter("oEntity").EngagementProject = "00000352";
							oEvent.getParameter("oEntity").ConditionRateValue = "100.00";
							oEvent.getParameter("oEntity").ConditionRateValueUnit = "EUR";
							oEvent.getParameter("oEntity").ConditionQuantity = "1";
							oEvent.getParameter("oEntity").ConditionQuantityUnit = "H";
							oEvent.getParameter("oEntity").ConditionCalculationType = "C";
						}
					};
					oMockServer.attachAfter("MERGE", fnMergeAfter, "C_SlsPricingConditionRecordTP");
					//handling get C_SlsPricingConditionRecordTP step
					var fnGetAfter = function (oEvent) {
						//Output the results in reverse order of ConditionRecord
						var oResult = oEvent.getParameter("oFilteredData");
						if (oResult !== undefined) {
							for (var i = 0; i < oResult.__count / 2; i++) {
								var oTemp = oResult.results[oResult.__count - 1 - i];
								oResult.results[oResult.__count - 1 - i] = oResult.results[i];
								oResult.results[i] = oTemp;
							}
						}
					};
					oMockServer.attachAfter("GET", fnGetAfter, "C_SlsPricingConditionRecordTP");
					//start the server
					oMockServer.start();

					Log.info("Running the app with mock data");
					fnResolve();
					aAnnotations.forEach(function (sAnnotationName) {
						var oAnnotation = oDataSource[sAnnotationName],
							sUri = oAnnotation.uri,
							sLocalUri = jQuery.sap.getModulePath(_sAppPath + oAnnotation.settings.localUri.replace(".xml", ""), ".xml");

						///annotiaons
						new MockServer({
							rootUri: sUri,
							requests: [{
								method: "GET",
								path: RegExp(/((\w|\W)+|)/),
								response: function (oXhr) {
									jQuery.sap.require("jquery.sap.xml");

									var oAnnotations = jQuery.sap.sjax({
										url: sLocalUri,
										dataType: "xml"
									}).data;

									oXhr.respondXML(200, {}, jQuery.sap.serializeXML(oAnnotations));
									return true;
								}
							}]

						}).start();

					});

				});

				oManifestModel.attachRequestFailed(function () {
					var sError = "Failed to load application manifest";

					Log.error(sError);
					fnReject(new Error(sError));
				});
			});
		},

		/**
		 * @public returns the mockserver of the app, should be used in integration tests
		 * @returns {sap.ui.core.util.MockServer} the mockserver instance
		 */
		getMockServer: function () {
			return oMockServer;
		}
	};

	return oMockServerInterface;
});