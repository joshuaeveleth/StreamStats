﻿//------------------------------------------------------------------------------
//----- Network Navigation ---------------------------------------------------------------
//------------------------------------------------------------------------------

//-------1---------2---------3---------4---------5---------6---------7---------8
//       01234567890123456789012345678901234567890123456789012345678901234567890
//-------+---------+---------+---------+---------+---------+---------+---------+

// copyright:   2016 WiM - USGS

//    authors:  Jeremy K. Newson USGS Wisconsin Internet Mapping
//             
// 
//   purpose: hold relative information for network navigation tools 
//          
//discussion:
//   FINDPATHBETWEENPOINTS = 1,
//   FINDPATH2OUTLET = 2,3
//   GETNETWORKREPORT = 4

//Comments
//07.06.2016 jkn - Created

// Class
module StreamStats.Models {
    export interface INetworkNav {
        ModelType: number;
        locations: Array<WiM.Models.IPoint>;
        addLocation(pnt: WiM.Models.IPoint);
        requiredLocationLength: number;
        
    }

    abstract class NetworkNav implements INetworkNav{
        //properties
        public requiredLocationLength:number;
        private _locations: Array<WiM.Models.IPoint>;
        public get locations(): Array <WiM.Models.IPoint> {
            return this._locations;
        }
        public ModelType: number;
        //Constructor
        constructor(modelID:number, maxLocations: number) {
            this.requiredLocationLength = maxLocations;
            this.ModelType = modelID;
            this._locations = [];
        }

        //Methods
        public addLocation(pnt: WiM.Models.IPoint):void {
            this._locations.push(pnt);

            if (this._locations.length > this.requiredLocationLength)
                this._locations.shift();
        }
    }//end class

    export class PathBetweenPoints extends NetworkNav {
        //https://ssdev.cr.usgs.gov/streamstatsservices/navigation/1.geojson?rcode=RRB&startpoint=[-94.311504,48.443681]&endpoint=[-94.349721,48.450215]&crs=4326
        //properties
       
        //Constructor
        constructor() {
            super(1, 2);
        }
    }//end class
    export class Path2Outlet extends NetworkNav {
        //https://ssdev.cr.usgs.gov/streamstatsservices/navigation/2.geojson?rcode=RRB&startpoint=[-94.719923,48.47219]&crs=4326&workspaceID=RRB20160624114146710000
        //https://ssdev.cr.usgs.gov/streamstatsservices/navigation/3.geojson?rcode=RRB&startpoint=[-94.719923,48.47219]&crs=4326

        //properties
        private _workspaceID: string;
        public get workspaceID(): string {
            return this._workspaceID;
        }
        public set workspaceID(val: string) {
            this._workspaceID = val
        }
        //Constructor
        constructor() {
            super(2, 1);
            this._workspaceID = '';
        }
    }//end class
    export class NetworkReport extends NetworkNav {
        //https://ssdev.cr.usgs.gov/streamstatsservices/navigation/4.geojson?rcode=RRB&startpoint=[-94.719923,48.47219]&crs=4326&direction=Upstream&layers=NHDFlowline
        //properties
        public layerOptions: Array<any> = [{ name: "NHDFlowline", selected: true }, { name: "Gage", selected: false  }, { name: "Dam", selected:false  }];
        public DirectionOptions: Array<string> = ["Upstream", "Downstream"];
        public selectedDirectionType: string;
        public reportplaceholder: string;

        //Constructor
        constructor() {
            super(3, 1);
            this.selectedDirectionType = this.DirectionOptions[1];
        }

    }//end class

}//end namespace