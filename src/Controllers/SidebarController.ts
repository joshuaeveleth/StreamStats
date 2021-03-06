﻿//------------------------------------------------------------------------------
//----- SidebarController ------------------------------------------------------
//------------------------------------------------------------------------------

//-------1---------2---------3---------4---------5---------6---------7---------8
//       01234567890123456789012345678901234567890123456789012345678901234567890
//-------+---------+---------+---------+---------+---------+---------+---------+

// copyright:   2014 WiM - USGS

//    authors:  Jeremy K. Newson USGS Wisconsin Internet Mapping


//   purpose:  

//discussion:   Controllers are typically built to reflect a View. 
//              and should only contailn business logic needed for a single view. For example, if a View 
//              contains a ListBox of objects, a Selected object, and a Save button, the Controller 
//              will have an ObservableCollection ObectList, 
//              Model SelectedObject, and SaveCommand.

//Comments
//04.14.2015 jkn - Created

//Imports"
module StreamStats.Controllers {

    declare var search_api;

    'use strinct';
    interface ISidebarControllerScope extends ng.IScope {
        vm: SidebarController;
    }
    interface ILeafletData {
        getMap(mapID: any): ng.IPromise<any>;
        getLayers(mapID: any): ng.IPromise<any>;
    }
    interface ISidebarController {
        sideBarCollapsed: boolean;
        selectedProcedure: ProcedureType;
        selectedStatisticsGroupList: Services.IStatisticsGroup;
        setProcedureType(pType: ProcedureType): void;
        toggleSideBar(): void;
    }
    
    class SidebarController implements ISidebarController {
        //Events
        //-+-+-+-+-+-+-+-+-+-+-+-
        private _onSelectedStatisticsGroupChangedHandler: WiM.Event.EventHandler<WiM.Event.EventArgs>;
        //Properties
        //-+-+-+-+-+-+-+-+-+-+-+-
        public sideBarCollapsed: boolean;
        public selectedProcedure: ProcedureType;
        public toaster: any;
        public angulartics: any;
        public selectedStatisticsGroupList: Services.IStatisticsGroup;
        private searchService: WiM.Services.ISearchAPIService;
        private regionService: Services.IRegionService;
        private nssService: Services.InssService;
        private studyAreaService: Services.IStudyAreaService;       
        private modalService: Services.IModalService;    
        private leafletData: ILeafletData;
        private multipleParameterSelectorAdd: boolean;
        private explorationService: Services.IExplorationService;

        //Constructor
        //-+-+-+-+-+-+-+-+-+-+-+-
        static $inject = ['$scope', 'toaster', '$analytics', 'WiM.Services.SearchAPIService', 'StreamStats.Services.RegionService', 'StreamStats.Services.StudyAreaService', 'StreamStats.Services.nssService', 'StreamStats.Services.ModalService', 'leafletData', 'StreamStats.Services.ExplorationService', 'WiM.Event.EventManager'];
        constructor($scope: ISidebarControllerScope, toaster, $analytics, service: WiM.Services.ISearchAPIService, region: Services.IRegionService, studyArea: Services.IStudyAreaService, StatisticsGroup: Services.InssService, modal: Services.IModalService, leafletData: ILeafletData, exploration: Services.IExplorationService, private EventManager:WiM.Event.IEventManager) {
            $scope.vm = this;
            this.init();

            this.toaster = toaster;
            this.angulartics = $analytics;
            this.searchService = service;
            this.sideBarCollapsed = false;
            this.selectedProcedure = ProcedureType.INIT;
            this.regionService = region;
            this.nssService = StatisticsGroup;
            this.studyAreaService = studyArea;
            this.modalService = modal;
            this.leafletData = leafletData;
            this.multipleParameterSelectorAdd = true;
            this.explorationService = exploration;

            StatisticsGroup.onSelectedStatisticsGroupChanged.subscribe(this._onSelectedStatisticsGroupChangedHandler);

            //watch for map based region changes here
            $scope.$watch(() => this.regionService.selectedRegion,(newval, oldval) => {
                //console.log('region change', oldval, newval);
                if (newval == null) this.setProcedureType(1);
                else this.setProcedureType(2);
            });

            //watch for completion of regression region query
            $scope.$watch(() => this.studyAreaService.regressionRegionQueryComplete, (newval, oldval) => {
                if (newval == oldval) return;
                //console.log('regression query watch', oldval, newval);
                if (newval == null) this.setProcedureType(2);
                else this.setProcedureType(3);
            });

            //watch for completion of load parameters
            $scope.$watch(() => this.studyAreaService.parametersLoaded,(newval, oldval) => {
                if (newval == oldval) return;
                //console.log('parameters loaded', oldval, newval);
                if (newval == null) this.setProcedureType(3);
                else this.setProcedureType(4);
            });



            //$scope.$watch(() => this.studyAreaService.studyAreaParameterList,(newval, oldval) => {
            //    console.log('watch for modify basin chars ', newval, oldval);
            //});
        }

        public getLocations(term: string):ng.IPromise<Array<WiM.Services.ISearchAPIOutput>> {
            return this.searchService.getLocations(term);
        }
        public setProcedureType(pType: ProcedureType) {    
            //console.log('in setProcedureType', this.selectedProcedure, pType, this.canUpdateProcedure(pType));     

            if (this.selectedProcedure == pType || !this.canUpdateProcedure(pType)) {
                //capture issues and send notifications here
                //if (this.selectedProcedure == 3 && (pType == 4 )) this.toaster.pop("warning", "Warning", "Make sure you calculate selected basin characteristics before continuing", 5000);
                if (this.selectedProcedure == 2 && (pType == 3 || pType == 4 )) this.toaster.pop("warning", "Warning", "Make sure you have delineated a basin and clicked continue", 5000);
                return;
            }
            this.selectedProcedure = pType;
        }
        public toggleSideBar(): void {
            if (this.sideBarCollapsed) this.sideBarCollapsed = false;
            else this.sideBarCollapsed = true;          
        }
        public onAOISelect(item: WiM.Services.ISearchAPIOutput) {
            this.EventManager.RaiseEvent(WiM.Services.onSelectedAreaOfInterestChanged,this, new WiM.Services.SearchAPIEventArgs(item));          
        }
        public zoomRegion(inRegion: string) {
            var region = angular.fromJson(inRegion);
            //console.log('zooming to region: ', region);
            
        }
        public setRegion(region: Services.IRegion) {
            //ga event
            this.angulartics.eventTrack('initialOperation', { category: 'SideBar', label: 'Region Selection Button' });

            //console.log('setting region: ', region);
            if (this.regionService.selectedRegion == undefined || this.regionService.selectedRegion.RegionID !== region.RegionID)
                this.regionService.selectedRegion = region;
            this.setProcedureType(2);

            //get available parameters
            this.regionService.loadParametersByRegion();
        }

        public openStatePage(e, region) {
            e.stopPropagation(); e.preventDefault();
            
            //console.log('Opening state page for: ', region);
            this.modalService.openModal(Services.SSModalType.e_about, { "tabName": "regionInfo", "regionID": region});
            
            //var regionParsed = region.replace(' ', '_').toLowerCase();
            //window.open('https://water.usgs.gov/osw/streamstats/' + regionParsed + '.html', '_blank');
        }

        public resetWorkSpace() {
            //this.regionService.clearRegion();
            this.regionService.clearSelectedParameters();
            this.studyAreaService.clearStudyArea();
            this.studyAreaService.zoomLevel15 = true;
            this.nssService.clearNSSdata();
        }

        public startSearch(e) {
            e.stopPropagation(); e.preventDefault();
            $("#sapi-searchTextBox").trigger($.Event("keyup", { "keyCode": 13 }));
        }

        public startDelineate() {
            //console.log('in startDelineate', this.studyAreaService.canUpdate, this.studyAreaService.doDelineateFlag);
            this.leafletData.getMap("mainMap").then((map: any) => {
                //console.log('mapzoom', map.getZoom());
                if (map.getZoom() < 15) {
                    this.toaster.pop('error', "Delineate", "You must be at or above zoom level 15 to delineate.");
                    return;
                }
                else {
                    this.toaster.pop('success', "Delineate", "Click on a blue stream cell to start delineation");
                    this.studyAreaService.doDelineateFlag = !this.studyAreaService.doDelineateFlag;
                }
            });
        }

        public setStatisticsGroup(statisticsGroup: Services.IStatisticsGroup) {

            var checkStatisticsGroup = this.checkArrayForObj(this.nssService.selectedStatisticsGroupList, statisticsGroup);

            //console.log('set stat group: ', statisticsGroup, checkStatisticsGroup);

            //if toggled remove selected parameter set
            if (checkStatisticsGroup != -1) {

                //remove this statisticsGroup from the list
                this.nssService.selectedStatisticsGroupList.splice(checkStatisticsGroup, 1);

                //if no selected scenarios, clear studyareaparameter list
                if (this.nssService.selectedStatisticsGroupList.length == 0) {
                    this.studyAreaService.studyAreaParameterList = [];

                    this.regionService.parameterList.forEach((parameter) => {
                        parameter.checked = false;
                        parameter.toggleable = true;
                    });
                }
            }

            //add it to the list and get its required parameters
            else {

                this.nssService.selectedStatisticsGroupList.push(statisticsGroup);

                //get list of params for selected StatisticsGroup
                this.nssService.loadParametersByStatisticsGroup(this.regionService.selectedRegion.RegionID, statisticsGroup.ID, this.studyAreaService.selectedStudyArea.RegressionRegions.map(function (elem) {
                    return elem.code;
                }).join(","), this.studyAreaService.selectedStudyArea.RegressionRegions);
            }

        }

        //special function for searching arrays but ignoring angular hashkey
        public checkArrayForObj(arr, obj) {
            for (var i = 0; i < arr.length; i++) {
                if (angular.equals(arr[i], obj)) {
                    return i;
                }
            };
            return -1;
        }

        public multipleParameterSelector() {

            this.regionService.parameterList.forEach((parameter) => {

                //console.log('length of configuration.alwaysSelectedParameters: ', configuration.alwaysSelectedParameters.length);
             
                var paramCheck = this.checkArrayForObj(this.studyAreaService.studyAreaParameterList, parameter);

                if (this.multipleParameterSelectorAdd) {

                    //if its not there add it
                    if (paramCheck == -1) this.studyAreaService.studyAreaParameterList.push(parameter);
                    parameter.checked = true;
                }
                else {

                    //remove it only if toggleable
                    if (paramCheck > -1 && parameter.toggleable) {
                        this.studyAreaService.studyAreaParameterList.splice(paramCheck, 1);
                        //this.toaster.pop('warning', parameter.code + " is required by one of the selected scenarios", "It cannot be unselected");
                        parameter.checked = false;
                    }
                } 

     
            });

            //flip toggle
            this.multipleParameterSelectorAdd = !this.multipleParameterSelectorAdd;
        }

        public updateStudyAreaParameterList(parameter: any) {

            //console.log('in updatestudyarea parameter', parameter);

            //dont mess with certain parameters
            if (parameter.toggleable == false) {
                this.toaster.pop('warning', parameter.code + " is required by one of the selected scenarios", "It cannot be unselected");
                parameter.checked = true;
                return;
            }

            var index = this.studyAreaService.studyAreaParameterList.indexOf(parameter);

            if (index > -1) {
                //remove it
                this.studyAreaService.studyAreaParameterList.splice(index, 1);
            }
            else {
                //add it
                this.studyAreaService.studyAreaParameterList.push(parameter);
            }

        }

        public calculateParameters() {

            //ga event
            this.angulartics.eventTrack('CalculateParameters', {
                category: 'SideBar', label: this.regionService.selectedRegion.Name + '; ' + this.studyAreaService.studyAreaParameterList.map(function (elem) { return elem.code; }).join(",")});

            //console.log('in Calculate Parameters');
            this.studyAreaService.loadParameters();
        }

        public submitBasinEdits() {

            this.studyAreaService.showEditToolbar = false;

            //check if basin has been edited, if so we need to re-query regression regions
            if (this.studyAreaService.selectedStudyArea.Disclaimers['isEdited']) {

                //clear out any scenarios and other stuff
                this.nssService.clearNSSdata();

                this.studyAreaService.loadEditedStudyBoundary();

            }

        }

        public selectScenarios() {

            //if not, just continue
            this.setProcedureType(3);
        }

        public refreshWindow() {
            window.location.reload();
        }

        public generateReport() {

            //console.log('in estimateFlows');
            this.toaster.pop('wait', "Opening Report", "Please wait...",5000);

            //ga event
            this.angulartics.eventTrack('CalculateFlows', {
                category: 'SideBar', label: this.regionService.selectedRegion.Name + '; ' + this.nssService.selectedStatisticsGroupList.map(function (elem) { return elem.Name; }).join(",") });

            if (this.nssService.selectedStatisticsGroupList.length > 0 && this.nssService.showFlowsTable) {

                this.nssService.estimateFlows(this.studyAreaService.studyAreaParameterList,"value", this.regionService.selectedRegion.RegionID, this.studyAreaService.selectedStudyArea.RegressionRegions.map(function (elem) { return elem.code; }).join(","));
                if (this.studyAreaService.selectedStudyArea.Disclaimers["isRegulated"]) {
                    setTimeout(() => {
                        this.nssService.estimateFlows(this.studyAreaService.studyAreaParameterList, "unRegulatedValue", this.regionService.selectedRegion.RegionID, this.studyAreaService.selectedStudyArea.RegressionRegions.map(function (elem) { return elem.code; }).join(","), true);
                    }, 500);
                }
            }

            //move to nssService
            this.modalService.openModal(Services.SSModalType.e_report);
            this.nssService.reportGenerated = true;

            //pass mainMap basemap to studyAreaService
            this.leafletData.getMap("mainMap").then((map: any) => {
                this.leafletData.getLayers("mainMap").then((maplayers: any) => {
                    for (var key in maplayers.baselayers) {
                        if (map.hasLayer(maplayers.baselayers[key])) {
                            this.studyAreaService.baseMap = {};
                            this.studyAreaService.baseMap[key] = configuration.basemaps[key];
                        }//end if
                    }//next
                });//end getLayers                                
            });//end getMap 
        }

        public checkRegulation() {
            //console.log('checking for regulation');
            this.studyAreaService.upstreamRegulation();
        }

        private queryRegressionRegions() {

            //return if this state is not enabled
            if (!this.regionService.selectedRegion.ScenariosAvailable) {
                this.studyAreaService.regressionRegionQueryComplete = true;
                return;
            }

            this.nssService.queriedRegions = true;

            //send watershed to map service query that returns list of regression regions that overlap the watershed
            this.studyAreaService.queryRegressionRegions();
        }

        private queryStatisticsGroupTypes() {
            this.nssService.loadStatisticsGroupTypes(this.regionService.selectedRegion.RegionID, this.studyAreaService.selectedStudyArea.RegressionRegions.map(function (elem) {
                return elem.code;
            }).join(","));
        }

        private updateParameterValue(parameter) {
            console.log('in updateParameterValue: ', parameter, this.studyAreaService.requestParameterList);
            var paramIndex = this.studyAreaService.requestParameterList.indexOf(parameter.name);
            if (parameter.value >= 0 && paramIndex != -1) {
                this.studyAreaService.requestParameterList.splice(paramIndex, 1);
            }
        }

        public onSelectedStatisticsGroupChanged() {

            //console.log('StatisticsGroup param list changed.  loaded ', this.nssService.selectedStatisticsGroupList);

            //toggle show flows checkbox
            this.nssService.selectedStatisticsGroupList.length > 0 ? this.nssService.showFlowsTable = true : this.nssService.showFlowsTable = false;

            this.regionService.parameterList.forEach((parameter) => {

                //loop over whole statisticsgroups
                this.nssService.selectedStatisticsGroupList.forEach((statisticsGroup) => {

                    if (statisticsGroup.RegressionRegions) {

                        //get their parameters
                        statisticsGroup.RegressionRegions.forEach((regressionRegion) => {

                            regressionRegion.Parameters.forEach((param) => {

                                if (parameter.code.toLowerCase() == param.Code.toLowerCase()) {

                                    //configuration.alwaysSelectedParameters.forEach((alwaysSelectedParam) => {
                                    //    if (alwaysSelectedParam.name == parameter.code) return;
                                    //});

                                    //turn it on
                                    if (this.checkArrayForObj(this.studyAreaService.studyAreaParameterList, parameter) == -1) this.studyAreaService.studyAreaParameterList.push(parameter);
                                    parameter['checked'] = true;
                                    parameter['toggleable'] = false;
                                }

                            });
                        });
                    }
                });
            });
        }

        public OpenWateruse() {
            this.modalService.openModal(Services.SSModalType.e_wateruse);
        }

        private downloadGeoJSON() {

            var GeoJSON = angular.toJson(this.studyAreaService.selectedStudyArea.Features[1].feature);

            var filename = 'data.geojson';

            var blob = new Blob([GeoJSON], { type: 'text/csv;charset=utf-8;' });
            if (navigator.msSaveBlob) { // IE 10+
                navigator.msSaveBlob(blob, filename);
            } else {
                var link = <any>document.createElement("a");
                var url = URL.createObjectURL(blob);
                if (link.download !== undefined) { // feature detection
                    // Browsers that support HTML5 download attribute
                    link.setAttribute("href", url);
                    link.setAttribute("download", filename);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                else {
                    window.open(url);
                }
            }

        }

        //Helper Methods
        //-+-+-+-+-+-+-+-+-+-+-+-
        private init(): void { 
            //init event handler
            this._onSelectedStatisticsGroupChangedHandler = new WiM.Event.EventHandler<WiM.Event.EventArgs>(() => {
                this.onSelectedStatisticsGroupChanged();
            });
        }

        private canUpdateProcedure(pType: ProcedureType): boolean {
            //console.log('in canUpdateProcedure');
            //Project flow:
            var msg: string;
            try {               
                switch (pType) {
                    case ProcedureType.INIT:
                        return true;
                    case ProcedureType.IDENTIFY:
                        return this.regionService.selectedRegion != null;
                    case ProcedureType.SELECT:
                        //proceed if there is a regression region
                        return this.studyAreaService.regressionRegionQueryComplete;
                    case ProcedureType.BUILD:
                        return this.studyAreaService.parametersLoaded;
                    default:
                        return false;
                }//end switch          
            }
            catch (e) {
                //this.sm(new MSG.NotificationArgs(e.message, MSG.NotificationType.INFORMATION, 1.5));
                return false;
            }
        }
        private sm(msg: string) {
            try {
                //toastr.options = {
                //    positionClass: "toast-bottom-right"
                //};

                //this.NotificationList.unshift(new LogEntry(msg.msg, msg.type));

                //setTimeout(() => {
                //    toastr[msg.type](msg.msg);
                //    if (msg.ShowWaitCursor != undefined)
                //        this.IsLoading(msg.ShowWaitCursor)
                //}, 0)
            }
            catch (e) {
            }
        }

  
    }//end class

    enum ProcedureType {
        INIT = 1,
        IDENTIFY = 2,
        SELECT = 3,
        BUILD = 4
    }

    angular.module('StreamStats.Controllers')
        .controller('StreamStats.Controllers.SidebarController', SidebarController)
    
}//end module
 