$(function() {
	function MGSetupViewModel(parameters) {
		var self = this;


		self.mgLogUrl = "api/plugin/mgsetup";

		self.mgLog = function(stringToLog, priority){

			if (priority === undefined){
				priority = 1; //default priority level if not defined
			}
			if (stringToLog !== undefined){
				if (priority === 0){
					console.log(stringToLog);
				}
				if (priority === 1){
					console.log(stringToLog);
					//also send to Python side to log
					// var url = OctoPrint.getSimpleApiUrl("mgsetup");
					// console.log(url);
					// console.log(typeof(url));
					// console.log(url);
					OctoPrint.issueCommand(self.mgLogUrl, "mgLog", {"stringToLog":stringToLog,"priority":priority})
						// .done(function(response) {
						// 	// console.log("mgLog send to server-side done; response: "+response);
						// })
						.fail(function(response){
							console.log("mgLog send to server-side failed!  Response: "+response+" Original message: "+stringToLog);
						});
				}
			}
		};

		self.mgLog("Parameters: ",1);
		self.mgLog(parameters,1);

		self.rrf = ko.observable(true);
		self.rrfMaintenanceReport = ko.observable("");
		self.rrfConfig = ko.observable("");
		self.lastT1Offset = ko.observable(0.0);

		// Originally from Controls tab:
		self.loginState = parameters[0];
		self.settings = parameters[1];
		self.temperatures = parameters[2];
		self.userSettings = parameters[3];
		self.softwareUpdate = parameters[4];
		self.isErrorOrClosed = ko.observable(undefined);
		self.isOperational = ko.observable(undefined);
		self.isPrinting = ko.observable(undefined);
		self.isPaused = ko.observable(undefined);
		self.isError = ko.observable(undefined);
		self.isReady = ko.observable(undefined);
		self.isLoading = ko.observable(undefined);

		// Originally from Controls tab, not needed?:
		self.webcamDisableTimeout = undefined;
		self.keycontrolActive = ko.observable(false);
		self.keycontrolHelpActive = ko.observable(false);
		self.keycontrolPossible = ko.pureComputed(function () {
			return self.isOperational() && !self.isPrinting() && self.loginState.isUser() && !$.browser.mobile;
		});
		self.showKeycontrols = ko.pureComputed(function () {
			return self.keycontrolActive() && self.keycontrolPossible();
		});
		self.extrusionAmount = ko.observable(undefined);
		self.controls = ko.observableArray([]);
		self.distances = ko.observableArray([0.1, 1, 10, 100]);
		self.distance = ko.observable(10);
		self.feedRate = ko.observable(100);
		self.flowRate = ko.observable(100);
		self.feedbackControlLookup = {};
		self.controlsFromServer = [];
		self.additionalControls = [];


		// UI history:
		self.setupStepHistory = ko.observableArray([]);
		self.setupStepFuture = ko.observableArray([]);
		self.hasHistory = ko.observable(false);
		self.hasFuture = ko.observable(false);
		self.setupStep = ko.observable("0");
		self.maintenancePage = ko.observable(0);
		self.maintenanceThirteenPrepared = ko.observable(false);
		self.maintenanceThirteenSaved = ko.observable(false);
		self.specialNext = ko.observable(undefined); //used to alter flow - "goto load filament, then X instead of default Y"
		self.linkingToMaintenance = ko.observable(false);

		//UI controls:
		self.hideDebug = ko.observable(true);
		self.support_widget = undefined;
		self.mgtab = undefined;
		self.mgtabwarning = undefined;
		self.mglogin = undefined;
		self.lockButton = ko.observable(true);
		self.commandResponse = ko.observable("");
		self.googleGood = ko.observable(-1);
		self.newHostname = ko.observable("");
		self.hostname = ko.observable();
		self.testDisplayValue = ko.observable(parseFloat(self.displayBedTemp));
		// self.displayBedTemp = ko.observable(undefined);
		// self.displayBedTempTarget = ko.observable(undefined);
		// self.displayToolTemp = ko.observable(undefined);
		// self.displayToolTempTarget = ko.observable(undefined);
		// self.displayTool1Temp = ko.observable(undefined);
		// self.displayTool1TempTarget = ko.observable(undefined);
		// self.displayBedTemp(self.temperatures.bedTemp.actual);
		// self.displayBedTempTarget(self.temperatures.bedTemp.target);
		self.preventTabReset = ko.observable(false);

		self.untouchable = ko.computed(function(){
			if (self.temperatures.bedTemp !== undefined && self.temperatures.bedTemp.target() !== undefined && self.temperatures.tools()[0] !== undefined && self.temperatures.tools()[0].target() !== undefined ){

				if (parseFloat(self.temperatures.bedTemp.actual()) > 50 || parseFloat(self.temperatures.tools()[0].actual()) > 50 || (self.temperatures.tools()[1] !== undefined && parseFloat(self.temperatures.tools()[1].actual()) > 50)){
					//console.log("untouchable");
					return true;
				} else{
					//console.log("touchable");
					return false;
				}
			}
		},this);


		self.displayBedTemp = ko.computed(function(){
			if (self.temperatures.bedTemp !== undefined){
				return self.temperatures.bedTemp.actual().toFixed(1);
			} else {
				return "No Data";
			}
		},this);
		self.displayBedTempTarget = ko.computed(function(){
			if (self.temperatures.bedTemp !== undefined){
				return self.temperatures.bedTemp.target();
			} else {
				return "No Data";
			}
		},this);
		self.displayToolTemp = ko.computed(function(){
			if (self.temperatures.tools()[0] !== undefined){
				return self.temperatures.tools()[0].actual().toFixed(1);
			} else {
				return "No Data";
			}
		},this);
		self.displayToolTempTarget = ko.computed(function(){
			if (self.temperatures.tools()[0] !== undefined){
				return self.temperatures.tools()[0].target();
			} else {
				return "No Data";
			}
		},this);
		self.displayTool1Temp = ko.computed(function(){
			if (self.temperatures.tools()[1] !== undefined){
				return self.temperatures.tools()[1].actual().toFixed(1);
			} else {
				return "No Data";
			}
		},this);
		self.displayTool1TempTarget = ko.computed(function(){
			if (self.temperatures.tools()[1] !== undefined){
				return self.temperatures.tools()[1].target();
			} else {
				return "No Data";
			}
		},this);



		self.tools = ko.observableArray([]);
		self.tools(self.temperatures.tools());

		self.isDual = ko.pureComputed(function(){
			if (self.settings.printerProfiles.currentProfileData().extruder.count() == 2){
				self.mgLog("We're a Dual!");
				return true;
			} else {
				self.mgLog("We're a Single!");
				return false;
			}
		},this); //stand-in for setting dual vs. single - set to true for now/testing - TODO - change this to actually check/reflect dual state

//		self.isDual = ko.observable(false);

		self.maxSteps = ko.pureComputed(function(){
			if (self.hasProbe()){
				return 5;
			} 
			else if (self.isDual()){
				return 16;
			} else{
				return 8;
			}
		},this);

		self.stepProgressArray = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,1,2,2,3,3,5,4,2,2,0,0,0,2,0]; //TODO - update this for all new step pages
		//						  0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 161718192021222324252627282930 
		//This works by having an array index for each step in the flow; the step's index is the same as it's step "number".  The numbers in the array relate to how far through the setup process
		//that step number is.  self.maxSteps() above returns the max steps for a given flow (dual, single, probe or no, etc.); the progress bar is set to the number in the array / max steps.



		self.hasProbe = ko.observable(false);
		// self.hasProbe = ko.pureComputed(function(){
		// 	if (self.settings.printerProfiles.currentProfileData().model().indexOf("probe") !== -1 ){
		// 		self.mgLog("hasProbe is true!");
		// 		return true;
		// 	} else {
		// 		self.mgLog("hasProbe is false!");
		// 		return false;
		// 	}
		// },this);

		self.ipAddress = ko.observable(undefined);
		self.ipPort = ko.observable(undefined);
		self.hostnameJS = ko.observable(undefined);
		self.printerViewString = ko.observable(undefined);
		self.apiKey = ko.observable(undefined);
		self.printerViewString = ko.pureComputed(function(){
			if ((self.settings.api_enabled()) && (self.settings.api_allowCrossOrigin())){
				if ((self.ipAddress()!==undefined) && (self.hostnameJS() !== undefined) && (self.ipPort()!== undefined) ){
					return ("IP:"+self.ipAddress().toString()+"|HOSTNAME:"+self.hostnameJS()+"|PORT:"+self.ipPort()+"|API:"+self.apiKey());
				} else {
					return ("One or more values are undefined.");
				}
			} else {
				return ("API and/or CORS are Disabled - Enable both in the API settings.");
			}
		},this);
		self.showMaintenanceBuilder = ko.observable(false);
		self.showMaintenanceButtons = ko.observable(false);
		self.showMaintenanceChecklist = ko.observable(false);
		self.showMgsetupDebugChecklist = ko.observable(false);
		self.octoprintVersion = ko.observable("");
		self.mgsetupVersion = ko.observable("");
		self.smbpatchstring = ko.observable("");
		self.softwareUpgraded = ko.observable(false);





		// Settings controls:
		self.newNetconnectdPassword = ko.observable("");
		self.unlockAdvanced = ko.observable(false);
		self.pluginVersion = ko.observable("");
		self.firmwareline = ko.observable("");
		self.profileString = ko.observable("");
		self.hotendSwapComplete = ko.observable(false);
		self.newCurrentProjectName = ko.observable("");

		// Quick Check Process starting/default values:
		self.printerValueVersion = ko.observable(0); //storage location for the printer value version - a 4 character random code generated on the server side to 
		//allow easy determination of server vs. client side state of values
		self.ZWiggleHeight = ko.observable(0.20);
		self.T1ZWiggleHeight = ko.observable(0.20);
		self.stockZWiggleHeight = 0.20;
		self.WiggleToRun = ko.observable(2);
		self.WiggleReady = ko.observable(true);
		self.ZOffset = ko.observable();
		self.currentZPosition = ko.observable(undefined);
		self.ZPos = ko.observable();
		self.ZPosFresh = ko.observable();
		self.zoffsetline = ko.observable();		
		self.eepromM206RegEx = /M206 ([X])(.*)[^0-9]([Y])(.*)[^0-9]([Z])(.*)/;
		self.zoffsetlineextract = ko.pureComputed(function() {
			var match = self.eepromM206RegEx.exec(self.zoffsetline());
				//alert('M206 loaded; Z Home Offset: '+self.eepromData()[2].value);
			if (self.originalZOffset !== "undefined"){
				self.originalZOffset = parseFloat(match[6]);
				self.ZOffset(self.originalZOffset);
			}
			self.mgLog("Zoffsetline keys: " + self.zoffsetline().keys());
				//alert('M206 loaded; Z Home Offset: '+self.originalZOffset.toString());
		},this);
		self.mgLog("Zoffsetline: "+self.zoffsetline()); //comment out until fix TODO
		self.eepromData = ko.observableArray([]);
		self.coldLevelCheckPosition = ko.observable(0);
		self.stepOnePrepared = ko.observable(false); //implemented, good
		self.stepTwoPrepared = ko.observable(false); //implemented, good
		self.stepTwoStartingHeightSaved = ko.observable(false); //implemented, good
		self.stepThreeStartHeatingClicked = ko.observable(false); //implemented, good
		self.stepFourShowFineAdjustments = ko.observable(false);
		self.stepFourFirstWiggleClicked = ko.observable(false); //implemented, good
		self.stepFiveBeginCornerCheckClicked = ko.observable(false); //implemented, good
		self.stepSixPrepared = ko.observable(false); //implemented/updated
		self.stepSixWigglePrinted = ko.observable(false); //implemented, good
		self.tooloffsetline = ko.observable(undefined);
		self.tool1XOffset = ko.observable(undefined);
		self.tool1YOffset = ko.observable(undefined);
		self.tool1ZOffset = ko.observable(undefined);
		self.stepTwentyEightGuideFollowed = ko.observable(undefined);
		self.stepTwentyEightHotendReplaced = ko.observable(undefined);
		self.stepTwentyNineFilament = ko.observable(undefined);
		self.stepTwentyNineNext = ko.observable(undefined);




		// Orphaned Variables?  Test...:
		self.homeWiggleArray = ('"{% set xpos = parameters.wiggleX %}","{% set ypos = parameters.wiggleY %}","{% set zpos = parameters.wiggleHeight %}","{% set tohome = parameters.tohome %}","{% set wigglenumber = parameters.wigglenumber %}","{% set ypurge = 30 + (2 * wigglenumber ) %}","{% set epurge = 13 - wigglenumber %}","G90","M82","{% if tohome == true %}","G28","{% endif %}","G1 F1000 X205 Y{{ ypurge }} Z10","G1 F1000 Z{{ zpos }}","G92 E0","G1 F240 E{{ epurge }}","G1 F240 X190 E{{ epurge + 2}}","G1 F360 E{{ epurge + 1}}","G92 E0","G1 F1000 Z10","G1 F2500 X{{xpos}} Y{{ypos}} Z{{ zpos }}","G1 E0.95","G92 E0","G91","M83","G91","G1 X20 E0.5 F1000","G3 Y0.38 J0.19 E0.014","G1 X-20 E0.5","G3 Y0.385 J0.1925 E0.014","G1 X20 E0.5 F1000","G3 Y0.39 J0.185 E0.014","G1 X-20 E0.5","G3 Y0.395 J0.1975 E0.014","G1 X20 E0.5","G3 Y0.40 J0.2 E0.014","G1 X-20 E0.5","G3 Y0.405 J0.2025 E0.014","G1 X20 E0.5","G3 Y0.41 J0.205 E0.014","G1 X-20 E0.5","G3 Y0.415 J0.2075 E0.014","G1 X20 E0.5","G3 Y0.42 J0.21 E0.014","G1 X-20 E0.5","G3 Y0.425 J0.2125 E0.014","G1 X20 E0.5","G3 Y0.43 J0.215 E0.014","G1 X-20 E0.5","G3 Y0.435 J0.2175 E0.014","G1 X20 E0.5","G3 Y0.44 J0.22 E0.014","G1 X-20 E0.5","G3 Y0.445 J0.2225 E0.014","G1 X20 E0.5","G3 Y0.45 J0.225 E0.014","G1 X-20 E0.5","G3 Y0.455 J0.2275 E0.014","G1 X20 E0.5","G3 Y0.46 J0.23 E0.014","G1 X-20 E0.5","G3 Y0.465 J0.2325 E0.014","G1 Z10 E0.5","G1 F360 E-1","G90","M82","G92 E0","{% if wigglenumber <= 3 %}","G1 F2000 X170 Y200","{% endif %}","{% if wigglenumber == 4 %}","G1 F2000 X20 Y200","{% endif %}","{% if wigglenumber == 5 %}","G1 F2000 X170 Y200","{% endif %}"');
		self.googleChecks = ko.observable(0);
		self.waitingForM = ko.observable(false);
		self.showFontAwesome = ko.observable(false);
		self.ZPosStatus = ko.pureComputed(function() {
			if (self.ZPosFresh === true) {
				return "Fresh";
			}
			if (self.ZPosFresh === false) {
				alert("stale");
				return "Stale";
			}
		},this);
		self.setupStepSelect = ko.observable(7);
		self.maintenancePageSelect = ko.observable(0);
		self.setupStepOne = ko.observable(true);
		self.setupStepTwo = ko.observable(false);
		self.setupStepThree = ko.observable(false);
		self.testtest = ([1,2,3,"test"]);
		self.testDisplayValue = ko.observable(parseFloat(self.displayBedTemp)); 

		self.mgLog("Loginstate: "+self.loginState);

		// Support/Activation/Registration relevant:
		self.unlockSupport = ko.observable(false);
		self.remindPlease = ko.observable(false);
		self.serialNumber = ko.observable("");
		self.firstName = ko.observable("");
		self.lastName = ko.observable("");

		self.dateReceived = ko.observable("");
		self.emailAddress = ko.observable("");
		self.channel = ko.observable(undefined);
		self.referrer = ko.observable(undefined);
		self.segment = ko.observable(undefined);
		self.newsletter = ko.observable(true);
		self.channelOther = ko.observable(false);
		self.referrerOther = ko.observable(false);
		self.segmentOther = ko.observable(false);
		self.channelOtherInput = ko.observable(undefined);
		self.referrerOtherInput = ko.observable(undefined);
		self.segmentOtherInput = ko.observable(undefined);
		self.channelOptions = ko.observableArray(['-','MakerGear.com','Amazon','Other - Please Specify Below']);
		self.referrerOptions = ko.observableArray(['-','Friend/Colleague','Reviews','Amazon','Social Media','Other - Please Describe Below']);
		self.segmentOptions = ko.observableArray(['-','Education: K-12','Education: College/University/Trade School','Business: <100 Employees','Business: >100 Employees','Individual: Hobby','Individual: Professional','Government','Other - Please Describe Below']);
		self.registered = ko.observable(false);
		self.activated = ko.observable(false);
		self.userActivation = ko.observable("");
		self.supportState = ko.pureComputed(function() {

			if (self.registered() === false){
				return "Register";
			}
			else if (self.registered() === true && self.activated() === false){
				return "Activate";
			}
			else{
				return "Support";
			}
		}, this);




																																										 
	//  ad88888ba                                                      88888888888                                                 88                                       
	// d8"     "8b                ,d                                   88                                                   ,d     ""                                       
	// Y8,                        88                                   88                                                   88                                              
	// `Y8aaaaa,     ,adPPYba,  MM88MMM  88       88  8b,dPPYba,       88aaaaa      88       88  8b,dPPYba,    ,adPPYba,  MM88MMM  88   ,adPPYba,   8b,dPPYba,   ,adPPYba,  
	//   `"""""8b,  a8P_____88    88     88       88  88P'    "8a      88"""""      88       88  88P'   `"8a  a8"     ""    88     88  a8"     "8a  88P'   `"8a  I8[    ""  
	//         `8b  8PP"""""""    88     88       88  88       d8      88           88       88  88       88  8b            88     88  8b       d8  88       88   `"Y8ba,   
	// Y8a     a8P  "8b,   ,aa    88,    "8a,   ,a88  88b,   ,a8"      88           "8a,   ,a88  88       88  "8a,   ,aa    88,    88  "8a,   ,a8"  88       88  aa    ]8I  
	//  "Y88888P"    `"Ybbd8"'    "Y888   `"YbbdP'Y8  88`YbbdP"'       88            `"YbbdP'Y8  88       88   `"Ybbd8"'    "Y888  88   `"YbbdP"'   88       88  `"YbbdP"'  
	//                                                88                                                                                                                    
	//                                                88                                                                                                                    

		self.storeWigglePosition = ko.observable(undefined);
		self.storeInputWiggleHeight = ko.observable(undefined);
		self.hasInputWiggleHeight = ko.observable(false);
		self.customWiggle = ko.observable(undefined);
		self.customWiggleSelect = ko.observable(undefined);


		self.printWiggleConfirm = function(wigglePosition, inputWiggleHeight){
			self.mgLog("printWiggleConfirm triggered");
			if(wigglePosition === "custom" && self.customWiggle() === undefined){
				self.notify("Error - Please Select Configuration","Please select machine configuration before printing the first Zigzag","error");
				return;
			}
			if(wigglePosition === "T1-custom" && self.customWiggle() === undefined){
				self.notify("Error - Please Select Configuration","Please select machine configuration before printing the first Zigzag","error");
				return;
			}
			if (wigglePosition !== undefined){
				self.storeWigglePosition(wigglePosition);
			}
			if (inputWiggleHeight !== undefined){
				self.storeInputWiggleHeight(inputWiggleHeight);
				self.hasInputWiggleHeight(true);
			} else {
				self.hasInputWiggleHeight(false);
				self.storeInputWiggleHeight(undefined);
			}
			self.printWiggleDialog.modal("show");
		};


		self.printWiggle = function (wigglePosition, inputWiggleHeight) {

			self.wiggleHeightAdjust = 0.1;
			self.mgLog("wigglePosition: "+wigglePosition);
			self.mgLog("inputWiggleHeight: "+inputWiggleHeight);
			self.mgLog("wiggleHeightAdjust: "+self.wiggleHeightAdjust);

				


			//console.log(typeof(self.ZWiggleHeight()));
			if (wigglePosition === undefined){
				wigglePosition = self.storeWigglePosition();
			}
			
			if (inputWiggleHeight !== undefined){
				self.ZWiggleHeight(parseFloat((parseFloat(self.ZWiggleHeight())+parseFloat(inputWiggleHeight)).toFixed(2)).toFixed(2));
				//self.T1ZWiggleHeight(parseFloat((parseFloat(self.T1ZWiggleHeight())+parseFloat(inputWiggleHeight)).toFixed(2)).toFixed(2));
				self.mgLog("ZWiggleHeight adjusted: "+self.ZWiggleHeight());
				//console.log(typeof(self.ZWiggleHeight()));
			}

			if (inputWiggleHeight === undefined){
				if (self.hasInputWiggleHeight()){
					inputWiggleHeight = self.storeInputWiggleHeight();
					self.ZWiggleHeight(parseFloat((parseFloat(self.ZWiggleHeight())+parseFloat(inputWiggleHeight)).toFixed(2)).toFixed(2));
					//self.T1ZWiggleHeight(parseFloat((parseFloat(self.T1ZWiggleHeight())+parseFloat(inputWiggleHeight)).toFixed(2)).toFixed(2));
					self.mgLog("ZWiggleHeight adjusted: "+self.ZWiggleHeight());
					//console.log(typeof(self.ZWiggleHeight()));
				}

			}

			if (wigglePosition === 0){
				//just to keep this from being empty...
			}

			if (wigglePosition === 1){
				if (self.setupStep() === '4'){
					self.stepFourFirstWiggleClicked(true);
				}

				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
					heatup: true,
					wiggleX: 90,
					wiggleY: 110,
					tohome: true,
					wigglenumber: parseFloat(wigglePosition),
					tool: 0};
				var context = {};
				self.mgLog("parameters.wiggleHeight: "+parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters); //remove this semicolon for further .then testing
//				OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
				//OctoPrint.control.sendGcodeScriptWithParameters("/plugin/hellopablo/static/gcode/homeWiggle.gcode",context,parameters);
		//                .then( function() {
		//                    alert("Gcode script done!");
		//
		//              });
			}

			if (wigglePosition === 2){
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
					heatup: true,
					wiggleX: 20,
					wiggleY: 20,
					tohome: true,
					wigglenumber: parseFloat(wigglePosition),
					tool: 0};
				var context = {};
				self.mgLog("parameters.wiggleHeight: "+parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeScriptWithParameters("/plugin/hellopablo/static/gcode/homeWiggle.gcode",context,parameters);
			}

			if (wigglePosition === 3){
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
					heatup: true,
					wiggleX: 170,
					wiggleY: 20,
					tohome: false,
					wigglenumber: parseFloat(wigglePosition),
					tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}

			if (wigglePosition === 4){
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
					heatup: true,
					wiggleX: 170,
					wiggleY: 220,
					tohome: false,
					wigglenumber: parseFloat(wigglePosition),
					tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}

			if (wigglePosition === 5){
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
					heatup: true,
					wiggleX: 20,
					wiggleY: 220,
					tohome: false,
					wigglenumber: parseFloat(wigglePosition),
					tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}

			if (wigglePosition === 6){
				self.setupStep('7');
			}

			if (wigglePosition === "next"){
				self.printWiggle(self.WiggleToRun());
				self.WiggleReady(false);
			}

			if (wigglePosition === "all"){
				if (self.setupStep() === '5' ){
					self.stepFiveBeginCornerCheckClicked(true);
				}

				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
					heatup: true,
					wiggleX: 20,
					wiggleY: 220,
					tohome: true,
					wigglenumber: parseFloat(1),
					tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggleAll", context, parameters);
			} 

			if (wigglePosition === "step6all"){
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
					heatup: true,
					wiggleX: 20,
					wiggleY: 220,
					tohome: false,
					wigglenumber: parseFloat(1),
					tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggleAll", context, parameters);
			} 

			if (wigglePosition === 10){ //same as position 1 but without homing
				self.mgLog("wigglePosition: "+wigglePosition);
				self.mgLog("inputWiggleHeight: "+inputWiggleHeight);
				self.mgLog("wiggleHeightAdjust: "+self.wiggleHeightAdjust);
				self.mgLog("ZWiggleHeight(): "+self.ZWiggleHeight());
				self.mgLog("typeof ZWiggleHeight(): "+typeof(self.ZWiggleHeight()));
				self.mgLog("typeof wiggleHeightAdjust: "+typeof(self.wiggleHeightAdjust));
				self.mgLog("ZWiggleHeight()+ wiggleHeightAdjust: "+parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust));
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
					heatup: true, wiggleX: 90,
					wiggleY: 110,
					tohome: false,
					wigglenumber: parseFloat(1),
					tool: 0};
				var context = {};
				self.mgLog("parameters.wiggleHeight: "+parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters); //remove this semicolon for further .then testing
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}

			if (wigglePosition === 20){ //same as position 2 but without homing
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
					heatup: true,
					wiggleX: 20,
					wiggleY: 20,
					tohome: false,
					wigglenumber: parseFloat(2),
					tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeScriptWithParameters("/plugin/hellopablo/static/gcode/homeWiggle.gcode",context,parameters);
			}

			if (wigglePosition === "dual"){
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()),
					heatup: true,
					wiggleX: 90,
					wiggleY: 110,
					tohome: true,
					wigglenumber: parseFloat(1),
					tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()),
					heatup: true,
					wiggleX: 90,
					wiggleY: 110,
					tohome: false,
					wigglenumber: parseFloat(1),
					tool: 1};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
			}

			if (wigglePosition === "T1"){
				if (self.setupStep() === '11'){
					self.stepElevenFirstWiggleClicked(true);
				}

				var context = {};
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()),
					heatup: true,
					wiggleX: 90,
					wiggleY: 110,
					tohome: true,
					wigglenumber: parseFloat(1),
					tool: 1};
				if (self.hasProbe()){
					OctoPrint.control.sendGcodeScriptWithParameters("probeWiggle", context, parameters);
				} else {
					OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				}
			}

			if (wigglePosition === "T1-maintenance"){
				if (self.maintenancePage() === 11 || self.maintenanceOperation() === "T0Hot"){
					self.stepElevenFirstWiggleClicked(true);
				}

				var context = {};
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()),
					heatup: true,
					wiggleX: 90,
					wiggleY: 110,
					tohome: true,
					wigglenumber: parseFloat(1),
					tool: 1};
				if (self.hasProbe()){
					OctoPrint.control.sendGcodeScriptWithParameters("probeWiggle", context, parameters);
				} else {
					OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				}
			}

			if (wigglePosition === "T1-2"){
				var context = {};
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()),
					heatup: true,
					wiggleX: 90,
					wiggleY: 110,
					tohome: false,
					wigglenumber: parseFloat(1),
					tool: 1};
				if (self.hasProbe()){
					OctoPrint.control.sendGcodeScriptWithParameters("probeWiggle", context, parameters);
				} else {
					OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				}
			}

			if (wigglePosition === "simple"){
				var context = {};
				//var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()), heatup: true, wiggleX: 90, wiggleY: 110, tohome: false, wigglenumber: parseFloat(1), tool: 1};
				var parameters = {};
				OctoPrint.control.sendGcodeScriptWithParameters("cross", context, parameters);
				self.stepTwelveSimpleClicked(true);
			}

			if (wigglePosition === "custom"){
				var context = {};
				if (self.stepElevenFirstWiggleClicked()){
					var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()),
						heatup: true,
						wiggleX: 90,
						wiggleY: 110,
						tohome: false,
						wigglenumber: self.customWiggle(),
						tool: 0};
				} else {
					var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()),
						heatup: true,
						wiggleX: 90,
						wiggleY: 110,
						tohome: true,
						wigglenumber: self.customWiggle(),
						tool: 0};
					self.stepElevenFirstWiggleClicked(true);
				}
				// var parameters = {};
				OctoPrint.control.sendGcodeScriptWithParameters("customWiggle", context, parameters);
			}

			if (wigglePosition === "T1-custom"){
				var context = {};
				if (self.stepElevenFirstWiggleClicked()){
					var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()), heatup: true,
						wiggleX: 90,
						wiggleY: 110,
						tohome: false,
						wigglenumber: self.customWiggle(),
						tool: 1};
				} else {
					var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()),
						heatup: true,
						wiggleX: 90,
						wiggleY: 110,
						tohome: true,
						wigglenumber: self.customWiggle(),
						tool: 1};
					self.stepElevenFirstWiggleClicked(true);
				}
				// var parameters = {};
				if (self.rrf()){
					parameters.wiggleX = 150;
					parameters.wiggleY = 177.5;
					parameters.wigglenumber = "050absflat";
					wiggleName = "customProbeWiggleRrf";
					OctoPrint.control.sendGcode(["M503"]);
				} else {
					wiggleName = "customWiggle";
				}
				OctoPrint.control.sendGcodeScriptWithParameters(wiggleName, context, parameters);
			}

			if (wigglePosition === "probe"){
				
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
				heatup: true,
				wiggleX: 90,
				wiggleY: 110,
				tohome: true,
				wigglenumber: parseFloat(1),
				tool: 0};
				if (self.stepTwentyFirstWiggleClicked()){
					parameters.tohome = false;
				}
				var context = {};
				self.mgLog("parameters.wiggleHeight: "+parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("probeWiggle", context, parameters);
				if (self.setupStep() === '20' || self.maintenancePage() === 20){
					self.stepTwentyFirstWiggleClicked(true);
				}
			}
			if (wigglePosition === "probe-custom"){
				
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
				heatup: true,
				wiggleX: 90,
				wiggleY: 110,
				tohome: true,
				wigglenumber: self.customWiggle(),
				tool: 0};
				if (self.stepTwentyFirstWiggleClicked()){
					parameters.tohome = false;
				}
				var context = {};
				self.mgLog("parameters.wiggleHeight: "+parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("customProbeWiggle", context, parameters);
				if (self.setupStep() === '20' || self.maintenancePage() === 200 || self.maintenanceOperation() === "T0Hot" || self.maintenanceTask() === "SetHot" || self.maintenanceTask() === "SetT1Hot"){
					self.stepTwentyFirstWiggleClicked(true);
				}
			}
			if (wigglePosition === "probeRrf"){
				//wiggleX should be 203, but set to 178 for the moment to deal with torn tape TODO - fix, obvs
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2),
				heatup: true,
				wiggleX: 150,
				wiggleY: 177.5,
				tohome: true,
				wigglenumber: "050absflat",
				tool: 0};
				if (self.stepTwentyFirstWiggleClicked()){
					parameters.tohome = false;
				}
				var context = {};
				OctoPrint.control.sendGcode(["M503"]);
				self.mgLog("parameters.wiggleHeight: "+parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("customProbeWiggleRrf", context, parameters);
				if (self.setupStep() === '20' || self.maintenancePage() === 200 || self.maintenanceOperation() === "T0Hot" || self.maintenanceTask() === "SetHot" || self.maintenanceTask() === "SetT1Hot"){
					self.stepTwentyFirstWiggleClicked(true);
				}
			}

		};

		self.feedFilament = function(targetTool) {

			if (targetTool === undefined){
				targetTool = "tool0";
			}
			if (targetTool == "tool0"){
				OctoPrint.control.sendGcode(["M300 S1040 P700",
					"G4 P750",
					"T0",
					"G91",
					"G1 E75 F400",
					"G90"]);
			} else if (targetTool == "tool1"){
				OctoPrint.control.sendGcode(["M300 S1040 P700",
					"G4 P750",
					"T1",
					"G91",
					"G1 E75 F400",
					"G90"]);
			}

			// OctoPrint.control.sendGcode(["M300 S1040 P700"]);

			// OctoPrint.printer.extrude(75, {"tool":targetTool});
		};

		self.retractFilament = function(targetTool) {

			if (targetTool === undefined){
				targetTool = "tool0";
			}
			if (targetTool == "tool0"){
				OctoPrint.control.sendGcode(["M300 S1040 P700",
					"G4 P750",
					"T0",
					"G91",
					"G1 E-75 F400",
					"G90"]);
			} else if (targetTool == "tool1"){
				OctoPrint.control.sendGcode(["M300 S1040 P700",
					"G4 P750",
					"T1",
					"G91",
					"G1 E-75 F400",
					"G90"]);
			}

			// OctoPrint.control.sendGcode(["M300 S1040 P700"]);

			// OctoPrint.printer.extrude(-75, {"tool":targetTool});
		};

		self.sendWigglePreheat = function (targetHotend, targetTemperature) {
			var temperature;
			var hotend;
			var wiggleBedTemp;

			if (self.rrf()){
				self.setRrfBedTemperature(wiggleBedTemp);
			}
			
			if (targetTemperature === undefined){
				temperature = 220;
			} else {
				temperature = targetTemperature;
			}
			if (temperature >= 230){
				wiggleBedTemp = 110;
			} else {
				wiggleBedTemp = 70;
			}
			if (targetHotend === undefined){
				hotend = "T0";
			} else {
				hotend = targetHotend;
			}
			if (hotend == "T0"){

				if (self.hasProbe() || self.rrf()){

					OctoPrint.control.sendGcode([
						"M104 T0 S"+temperature.toString(),
						"M140 S"+wiggleBedTemp.toString(),
						"M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"G28 XYZ",
						"T0",
						"G1 F1500 X20 Y100 Z100",
						"M109 S"+temperature.toString()+" T0",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
				} else {
					OctoPrint.control.sendGcode([
						"M104 T0 S"+temperature.toString(),
						"M140 S"+wiggleBedTemp.toString(),
						"M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"G28 Z",
						"G28 Y X",
						"T0",
						"G1 F1500 X20 Y100 Z100",
						"M109 S"+temperature.toString()+" T0",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
				}
			} else if (hotend == "T1"){
				
				if (self.rrf()){

					OctoPrint.control.sendGcode([
						"M104 T1 S"+temperature.toString(),
						"M140 S"+wiggleBedTemp.toString(),
						"M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"G28",
						"T0",
						"G1 F1500 X20 Y100 Z100",
						"M109 S"+temperature.toString()+" T1",
						"T1",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
				} else if (self.hasProbe()){

					OctoPrint.control.sendGcode([
						"M104 T1 S"+temperature.toString(),
						"M140 S"+wiggleBedTemp.toString(),
						"M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"G28 XYZ",
						"T0",
						"G1 F1500 X20 Y100 Z100",
						"M109 S"+temperature.toString()+" T1",
						"T1",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
				} else {
					OctoPrint.control.sendGcode([
						"M104 T1 S"+temperature.toString(),
						"M140 S"+wiggleBedTemp.toString(),
						"M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"G28 Z",
						"G28 Y X",
						"T0",
						"G1 F1500 X20 Y100 Z100",
						"M109 S"+temperature.toString()+" T1",
						"T1",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
				}
			} else if (hotend == "both"){
					if (self.hasProbe() || self.rrf()){

						OctoPrint.control.sendGcode([
							"M104 T0 S"+temperature.toString(),
							"M104 T1 S"+temperature.toString(),
							"M140 S"+wiggleBedTemp.toString(),
							"M300 S1040 P250",
							"M300 S1312 P250", 
							"M300 S1392 P250",
							"G4 P750",
							"G28 XYZ",
							"G1 F1500 Z50",
							"T0",
							"G1 F1500 X20 Y100 Z100",
							"T1",
							"G1 F1500 X180",
							"T0",
							"M109 S"+temperature.toString()+" T0",
							"M109 S"+temperature.toString()+" T1",
							"M400",
							"M300 S1392 P250",
							"M300 S1312 P250", 
							"M300 S1040 P250"
						
					]);
				} else {
					OctoPrint.control.sendGcode([
						"M104 T0 S"+temperature.toString(),
						"M104 T1 S"+temperature.toString(),
						"M140 S"+wiggleBedTemp.toString(),
						"M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"G28 Z",
						"G1 F1500 Z50",
						"G28 Y X",
						"T0",
						"G1 F1500 X20 Y100 Z100",
						"T1",
						"G1 F1500 X180",
						"T0",
						"M109 S"+temperature.toString()+" T0",
						"M109 S"+temperature.toString()+" T1",
						"T1",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
				}
			}
		};


		self.sendMaintenancePreheat = function (targetHotend, targetTemperature) {
			var temperature;
			var hotend;



			if (targetTemperature === undefined){
				temperature = 220;
			} else {
				temperature = targetTemperature;
			}
			if (targetHotend === undefined){
				hotend = "T0";
			} else {
				hotend = targetHotend;
			}
			if (hotend == "T0"){

				OctoPrint.control.sendGcode([
					"M104 T0 S"+temperature.toString(),
					"M300 S1040 P250",
					"M300 S1312 P250", 
					"M300 S1392 P250",
					"G4 P750",
					"G28 Z",
					"G28 Y X",
					"G1 F1500 X20 Z100",
					"M109 S"+temperature.toString()+" T0",
					"M400",
					"M300 S1392 P250",
					"M300 S1312 P250", 
					"M300 S1040 P250"
					
				]);
			} else if (hotend == "T1"){
				OctoPrint.control.sendGcode([
					"M104 T1 S"+temperature.toString(),
					"M300 S1040 P250",
					"M300 S1312 P250", 
					"M300 S1392 P250",
					"G4 P750",
					"G28 Z",
					"G28 Y X",
					"G1 F1500 X20 Y100 Z100",
					"M109 S"+temperature.toString()+" T1",
					"T1",
					"M400",
					"M300 S1392 P250",
					"M300 S1312 P250", 
					"M300 S1040 P250"
					
				]);
			}
		};

		self.cooldown = function () {
			if (self.rrf()){
				self.setRrfBedTemperature("0");
			}
			OctoPrint.control.sendGcode(["M104 T0 S0",
				"M104 T1 S0",
				"M140 S0"
			]);
		};

		self.stepOneConfirm = function(){
			self.mgLog("stepOneConfirm triggered");
			self.stepOneDialog.modal("show");
		};


		self.setupCheckLevel = function (checkLevelStep) { //this is where the magic starts, folks
			self.ZPosFresh(false);
			if (checkLevelStep == "0") {


				OctoPrint.control.sendGcode(["M300 S1040 P250",
				"M300 S1312 P250", 
				"M300 S1392 P250",
				"G4 P750",
				"T0",
				"M605 S1",
				"G28",
				"G1 F2000 X217 Y125",
				"G1 F1400 Z0.25",
				"G4 P1000",
				"M84 X",
				"M400",
				"M300 S1392 P250",
				"M300 S1312 P250", 
				"M300 S1040 P250"
				
				]);//changed to X217 for Demeter
				self.stepOnePrepared(1);
			}
			if (checkLevelStep == "1") {

				OctoPrint.control.sendGcode(["M300 S1040 P250",
				"M300 S1312 P250", 
				"M300 S1392 P250",
				"G4 P750",
				"T0",
				"G28",
				"G1 F2000 X205 Y125",
				"G1 F1400 Z1",
				"G1 F1400 X195 Y125",
				"M400",
				"M300 S1392 P250",
				"M300 S1312 P250", 
				"M300 S1040 P250"
				
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X205 Y125");
//				OctoPrint.control.sendGcode("G1 F1400 Z1");
//				OctoPrint.control.sendGcode("G1 F1400 X195 Y125");
			}
			if (checkLevelStep == "2") {

				OctoPrint.control.sendGcode(["M300 S1040 P250",
				"M300 S1312 P250", 
				"M300 S1392 P250",
				"G4 P750",
				"T0",
				"G1 F1400 Z2",
				"G1 F2000 X20 Y220",
				"G1 F1400 Z0.2",
				"M400",
				"M300 S1392 P250",
				"M300 S1312 P250", 
				"M300 S1040 P250"
				
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X20 Y220");
//				OctoPrint.control.sendGcode("G1 F1400 Z0.2");
			}
			if (checkLevelStep == "3") {

				OctoPrint.control.sendGcode(["M300 S1040 P250",
				"M300 S1312 P250", 
				"M300 S1392 P250",
				"G4 P750",
				"T0",
				"G1 F1400 Z2",
				"G1 F2000 X20 Y20",
				"G1 F1400 Z-0.05",
				"M400",
				"M300 S1392 P250",
				"M300 S1312 P250", 
				"M300 S1040 P250"
				
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X20 Y20");
//				OctoPrint.control.sendGcode("G1 F1400 Z-0.05");
			}
			if (checkLevelStep == "4") { //for Dual

				OctoPrint.control.sendGcode(["M300 S1040 P250",
					"M300 S1312 P250", 
					"M300 S1392 P250",
					"G4 P750",
					"G28",
					"T0",
					"G1 F2000 X217 Y125",
					"G1 F1400 Z0.25",
					"G4 P1000",
					"M84 X",
					"T1",
					"G4 P1000",
					"M84 X",
					"M400",
					"M300 S1392 P250",
					"M300 S1312 P250", 
					"M300 S1040 P250"]);
			}
			OctoPrint.control.sendGcode("M114");
		};

		self.setupBedLevel = function (adjustLevelStep) { //this is where the magic continues, folks
			self.ZPosFresh(false);
			if (adjustLevelStep == "0") {
				OctoPrint.control.sendGcode(["T0",
				"M84 S0",
				"G28",
				"G1 F2000 X20 Y50",
				"G1 F1400 Z1"
				]);
				//OctoPrint.control.sendGcode("G28");
				//OctoPrint.control.sendGcode("G1 F2000 X20 Y50");
				//OctoPrint.control.sendGcode("G1 F1400 Z1");
			}
			if (adjustLevelStep == "1") {
				OctoPrint.control.sendGcode(["T0",
				"G1 F1400 Z3",
				"G1 F2000 X20 Y50",
				"G1 F1400 Z1"
				]);
				//OctoPrint.control.sendGcode("G28");
				//OctoPrint.control.sendGcode("G1 F2000 X20 Y50");
				//OctoPrint.control.sendGcode("G1 F1400 Z1");
			}
			if (adjustLevelStep == "2") {
				OctoPrint.control.sendGcode(["T0",
				"G1 F1400 Z3",
				"G1 F2000 X180 Y30",
				"G1 F1400 Z1"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X180 Y30");
//				OctoPrint.control.sendGcode("G1 F1400 Z1");
			}
			if (adjustLevelStep == "3") {
				OctoPrint.control.sendGcode(["T0",
				"G1 F1400 Z3",
				"G1 F2000 X180 Y230",
				"G1 F1400 Z1"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X180 Y230");
//				OctoPrint.control.sendGcode("G1 F1400 Z1");
			}
			if (adjustLevelStep == "4") {
				OctoPrint.control.sendGcode(["T0",
					"G1 F1400 Z3",
					"G1 F2000 X20 Y210",
					"G1 F1400 Z1"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X20 Y210");
//				OctoPrint.control.sendGcode("G1 F1400 Z1");
			}
			OctoPrint.control.sendGcode("M114");
		};

		self.setupSetStartingHeight = function (startingHeightStep) {
			self.ZPosFresh(false);
			self.requestEeprom();
			//self.ZPos(5);
			if (startingHeightStep == "0") {

				OctoPrint.control.sendGcode(["M300 S1040 P250",
				"M300 S1312 P250", 
				"M300 S1392 P250",
				"G4 P750",
				"T0",
				"G28",
				"G1 F1400 X100 Y125 Z50",
				"G1 F1400 Z5",
				"M114",
				"M400",
				"M300 S1392 P250",
				"M300 S1312 P250", 
				"M300 S1040 P250"
				
				]);
				//new PNotify({
				//	title: 'Starting Height Check',
				//	text: "Moving to check the Starting Height",
				//	type: 'success',
				//	//hide: self.settingsViewModel.settings.plugins.M117PopUp.autoClose()
				//	});
			}
			if (startingHeightStep == "00") { //for maintenance step

				OctoPrint.control.sendGcode(["M300 S1040 P250",
				"M300 S1312 P250", 
				"M300 S1392 P250",
				"G4 P750",
				"M605 S0",
				"T0",
				"G28 X",
				"T1",
				"G28 X",
				"T0",
				"M605 S1",
				"G28",
				"G1 F1400 X100 Y125 Z50",
				"G1 F1400 Z5",
				"M114",
				"M400",
				"M300 S1392 P250",
				"M300 S1312 P250", 
				"M300 S1040 P250"
				
				]);
				//new PNotify({
				//	title: 'Starting Height Check',
				//	text: "Moving to check the Starting Height",
				//	type: 'success',
				//	//hide: self.settingsViewModel.settings.plugins.M117PopUp.autoClose()
				//	});
			}
			if (startingHeightStep == "1") {
				if (self.ZPosFresh){
					//self.newZOffset = parseFloat(self.ZPos())-(parseFloat(self.ZOffset()));
					self.newZOffset = (parseFloat(self.ZOffset())-parseFloat(self.ZPos()));
					self.mgLog("newZOffset: "+self.newZOffset);
					self.mgLog("ZOffset(): "+self.ZOffset());
					self.mgLog("ZPos(): "+self.ZPos());
					//alert(self.newZOffset + " " + self.ZPos() + " " + self.ZOffset());
					self.ZOffString = "M206 Z"+self.newZOffset.toString();
					OctoPrint.control.sendGcode([self.ZOffString,
						"M500"
					]);
					self.ZOffset(self.newZOffset);
					self.requestEeprom();
					if (self.maintenanceOperation()!=="home"){
						self.nextMaintenanceTask();
					}
					//new PNotify({
					//	title: 'Starting Height Adjustment',
					//	text: "Starting Height Set to : "+self.newZOffset.toString(),
					//	type: 'success',
					//});
				}
			}
			if (startingHeightStep == "2") {
				self.newZOffset = (parseFloat(self.ZOffset())-parseFloat(parseFloat(self.ZWiggleHeight())-self.stockZWiggleHeight));
				if (self.newZOffset.toString() == "NaN") {
					self.notify("Offset Setting Error","There was an error when setting the Z Offset.  Please refresh the page and try again.  Support values: self.newZOffset="+self.newZOffset.toString()+" ; self.ZOffset="+self.ZOffset().toString()+" ; self.ZWiggleHeight="+self.ZWiggleHeight().toString()+" ; self.stockZWiggleHeight="+self.stockZWiggleHeight.toString(), "error");
					self.mgLog("Offset setting error:");
					self.mgLog("self.newZOffset = "+self.newZOffset.toString());
					self.mgLog("self.ZOffset = "+self.ZOffset().toString());
					self.mgLog("self.ZWiggleHeight = "+self.ZWiggleHeight().toString());
					return;
				}
				//self.newZOffset = self.newZOffset + 0.1 ;
				self.ZOffString = "M206 Z"+self.newZOffset.toString();
				self.mgLog("newZOffset: "+self.newZOffset.toString());
				self.mgLog("ZOffString: "+self.ZOffString);
				OctoPrint.control.sendGcode([self.ZOffString,
					"M500"					
				]);
				self.ZOffset(self.newZOffset);
				self.requestEeprom();
				//new PNotify({
				//	title: 'Starting Height Adjustment',
				//	text: "Starting Height Set to : "+self.newZOffset.toString(),
				//	type: 'success',
				//});
				self.ZWiggleHeight(self.stockZWiggleHeight);
				//self.setupStep("3");
				self.goTo("5");
			}

			if (startingHeightStep == "2-maintenance") {
				self.newZOffset = (parseFloat(self.ZOffset())-parseFloat(parseFloat(self.ZWiggleHeight())-self.stockZWiggleHeight));
				if (self.newZOffset.toString() == "NaN") {
					self.notify("Offset Setting Error","There was an error when setting the Z Offset.  Please refresh the page and try again.  Support values: self.newZOffset="+self.newZOffset.toString()+" ; self.ZOffset="+self.ZOffset().toString()+" ; self.ZWiggleHeight="+self.ZWiggleHeight().toString()+" ; self.stockZWiggleHeight="+self.stockZWiggleHeight.toString(), "error");
					self.mgLog("Offset setting error:");
					self.mgLog("self.newZOffset = "+self.newZOffset.toString());
					self.mgLog("self.ZOffset = "+self.ZOffset().toString());
					self.mgLog("self.ZWiggleHeight = "+self.ZWiggleHeight().toString());
					return;
				}
				//self.newZOffset = self.newZOffset + 0.1 ;
				self.ZOffString = "M206 Z"+self.newZOffset.toString();
				self.mgLog("newZOffset: "+self.newZOffset.toString());
				self.mgLog("ZOffString: "+self.ZOffString);
				OctoPrint.control.sendGcode([self.ZOffString,
					"M500"					
				]);
				self.ZOffset(self.newZOffset);
				self.requestEeprom();
				//new PNotify({
				//	title: 'Starting Height Adjustment',
				//	text: "Starting Height Set to : "+self.newZOffset.toString(),
				//	type: 'success',
				//});
				self.ZWiggleHeight(self.stockZWiggleHeight);
				self.nextMaintenanceTask();
				//self.setupStep("3");
			}

			if (startingHeightStep == "T1") {
				self.newZOffset = (parseFloat(self.tool1ZOffset())-parseFloat(parseFloat(self.ZWiggleHeight())-self.stockZWiggleHeight));
				if (self.newZOffset.toString() == "NaN") {
					self.notify("Offset Setting Error","There was an error when setting the Z Offset.  Please refresh the page and try again.  Support values: self.newZOffset="+self.newZOffset.toString()+" ; self.ZOffset="+self.ZOffset().toString()+" ; self.ZWiggleHeight="+self.ZWiggleHeight().toString()+" ; self.stockZWiggleHeight="+self.stockZWiggleHeight.toString(), "error");
					self.mgLog("Offset setting error:");
					self.mgLog("self.newZOffset = "+self.newZOffset.toString());
					self.mgLog("self.tool1ZOffset = "+self.tool1ZOffset().toString());
					self.mgLog("self.ZWiggleHeight = "+self.ZWiggleHeight().toString());
					return;
				}
				//self.newZOffset = self.newZOffset + 0.1 ;
				self.ZOffString = "M218 T1 Z"+self.newZOffset.toFixed(2);
				self.mgLog("newZOffset rounded to two places: "+self.newZOffset.toFixed(2));
				self.mgLog("ZOffString: "+self.ZOffString);
				OctoPrint.control.sendGcode([self.ZOffString,
					"M500"					
				]);
				self.tool1ZOffset(self.newZOffset);
				self.requestEeprom();
				//new PNotify({
				//	title: 'Starting Height Adjustment',
				//	text: "Starting Height Set to : "+self.newZOffset.toString(),
				//	type: 'success',
				//});
				self.ZWiggleHeight(self.stockZWiggleHeight);
				//self.setupStep("3");
				if(Math.abs(self.tool1ZOffset())<=0.1){
					self.notify("Duplication Mode Compatibility","Your new T1 Z Offset is close enough that Duplication Mode printing should work without a raft.", "success");
				} else if(Math.abs(self.tool1ZOffset())<=0.20){
					self.notify("Duplication Mode Compatibility","Your new T1 Z Offset is close enough that Duplication Mode printing should work with a raft.", "notice");
				} else if(Math.abs(self.tool1ZOffset())>0.20){
					self.notify("Duplication Mode Compatibility","Your new T1 Z Offset is large enough that Duplication Mode printing will not work without adjusting your physical hotend height.  This can be adjusted in the Maintenance tab.", "error");
				}

				if(!self.hasProbe()){
					self.goTo("12");
				} else{
					self.goTo("26");
				}
			}

			if (startingHeightStep == "T1-maintenance") {
				self.newZOffset = (parseFloat(self.tool1ZOffset())-parseFloat(parseFloat(self.ZWiggleHeight())-self.stockZWiggleHeight));
				if (self.newZOffset.toString() == "NaN") {
					self.notify("Offset Setting Error","There was an error when setting the Z Offset.  Please refresh the page and try again.  Support values: self.newZOffset="+self.newZOffset.toString()+" ; self.ZOffset="+self.ZOffset().toString()+" ; self.ZWiggleHeight="+self.ZWiggleHeight().toString()+" ; self.stockZWiggleHeight="+self.stockZWiggleHeight.toString(), "error");
					self.mgLog("Offset setting error:");
					self.mgLog("self.newZOffset = "+self.newZOffset.toString());
					self.mgLog("self.tool1ZOffset = "+self.tool1ZOffset().toString());
					self.mgLog("self.ZWiggleHeight = "+self.ZWiggleHeight().toString());
					return;
				}
				//self.newZOffset = self.newZOffset + 0.1 ;

				if (self.rrf()){
					// self.ZOffString = "G10 P1 Z"+self.newZOffset.toFixed(2);
					self.adminAction('changeRrfConfig','command', {'targetParameter':'t1OffsetZ','newValue':self.newZOffset.toFixed(2)});
					self.mgLog("newZOffset rounded to two places: "+self.newZOffset.toFixed(2));
					self.mgLog("ZOffString: "+self.ZOffString);
					self.rrfMaintenanceReport(self.ZOffString+"\n"+self.rrfMaintenanceReport());
					// OctoPrint.control.sendGcode([self.ZOffString,
					// "M500 P31"					
					// ]);
				} else {
					self.ZOffString = "M218 T1 Z"+self.newZOffset.toFixed(2);
					self.mgLog("newZOffset rounded to two places: "+self.newZOffset.toFixed(2));
					self.mgLog("ZOffString: "+self.ZOffString);
					OctoPrint.control.sendGcode([self.ZOffString,
					"M500"					
					]);					
				}

				self.tool1ZOffset(self.newZOffset);
				self.requestEeprom();
				//new PNotify({
				//	title: 'Starting Height Adjustment',
				//	text: "Starting Height Set to : "+self.newZOffset.toString(),
				//	type: 'success',
				//});
				self.ZWiggleHeight(self.stockZWiggleHeight);
				//self.setupStep("3");
				// self.goTo("12");
				self.stepElevenFirstWiggleClicked(false);
				if(Math.abs(self.tool1ZOffset())<=0.1){
					self.notify("Duplication Mode Compatibility","Your new T1 Z Offset is close enough that Duplication Mode printing should work without a raft.", "success");
				} else if(Math.abs(self.tool1ZOffset())<=0.20){
					self.notify("Duplication Mode Compatibility","Your new T1 Z Offset is close enough that Duplication Mode printing should work with a raft.", "notice");
				} else if(Math.abs(self.tool1ZOffset())>0.20){
					self.notify("Duplication Mode Compatibility","Your new T1 Z Offset is large enough that Duplication Mode printing will not work without adjusting your physical hotend height.  This can be adjusted in the Maintenance tab.", "error");
				}
				if (self.maintenanceOperation()!=="home"){
					self.nextMaintenanceTask();
				}
			}
			if (startingHeightStep == "probe") {
				self.newProbeOffset = (parseFloat(self.probeOffset())+parseFloat(parseFloat(self.ZWiggleHeight())-self.stockZWiggleHeight));
				if (self.newProbeOffset.toString() == "NaN") {
					self.notify("Offset Setting Error","There was an error when setting the Probe Offset.  Please refresh the page and try again.  Support values: self.newProbeOffset="+self.newProbeOffset.toString()+" ; self.probeOffset="+self.probeOffset().toString()+" ; self.ZWiggleHeight="+self.ZWiggleHeight().toString()+" ; self.stockZWiggleHeight="+self.stockZWiggleHeight.toString(), "error");
					self.mgLog("Offset setting error:");
					self.mgLog("self.newProbeOffset = "+self.newProbeOffset.toString());
					self.mgLog("self.probeOffset = "+self.probeOffset().toString());
					self.mgLog("self.ZWiggleHeight = "+self.ZWiggleHeight().toString());
					return;
				}
				//self.newZOffset = self.newZOffset + 0.1 ;
				self.ProbeOffString = "M851 Z"+self.newProbeOffset.toString();
				self.mgLog("newProbeOffset: "+self.newProbeOffset.toString());
				self.mgLog("ProbeOffString: "+self.ProbeOffString);
				OctoPrint.control.sendGcode([self.ProbeOffString,
					"M500"					
				]);
				self.probeOffset(self.newProbeOffset);
				self.requestEeprom();
				//new PNotify({
				//	title: 'Starting Height Adjustment',
				//	text: "Starting Height Set to : "+self.newZOffset.toString(),
				//	type: 'success',
				//});
				self.stepTwentyFirstWiggleClicked(false);
				self.ZWiggleHeight(self.stockZWiggleHeight);
				self.customWiggle(undefined);
				//self.setupStep("17");
				if (self.maintenanceOperation()!=="home"){
					self.nextMaintenanceTask();
				} else {
					if (!self.isDual()){
						self.goTo("22");
					} else {
						self.goTo("26");
					}
				}
			}
			if (startingHeightStep == "00-probe") { //for maintenance step

				OctoPrint.control.sendGcode(["M300 S1040 P250",
				"M300 S1312 P250", 
				"M300 S1392 P250",
				"G4 P750",
				"M605 S0",
				"T0",
				"G28 XYZ",
				"G1 F1400 X100 Y125 Z20",
				"G1 F1400 Z5",
				"M114",
				"M400",
				"M300 S1392 P250",
				"M300 S1312 P250", 
				"M300 S1040 P250",
				"M211 S0"
				
				]);
				//new PNotify({
				//	title: 'Starting Height Check',
				//	text: "Moving to check the Starting Height",
				//	type: 'success',
				//	//hide: self.settingsViewModel.settings.plugins.M117PopUp.autoClose()
				//	});
			}
			if (startingHeightStep == "1-probe") {
				self.newProbeOffset = (parseFloat(self.probeOffset())+parseFloat(self.ZPos()));

				if (self.newProbeOffset.toString() == "NaN") {
					self.notify("Offset Setting Error","There was an error when setting the Probe Offset.  Please refresh the page and try again.  Support values: self.newProbeOffset="+self.newProbeOffset.toString()+" ; self.probeOffset="+self.probeOffset().toString()+" ; self.ZWiggleHeight="+self.ZWiggleHeight().toString()+" ; self.stockZWiggleHeight="+self.stockZWiggleHeight.toString(), "error");
					self.mgLog("Offset setting error:");
					self.mgLog("self.newProbeOffset = "+self.newProbeOffset.toString());
					self.mgLog("self.probeOffset = "+self.probeOffset().toString());
					self.mgLog("self.ZWiggleHeight = "+self.ZWiggleHeight().toString());
					return;
				}
				self.ProbeOffString = "M851 Z"+self.newProbeOffset.toString();
				self.mgLog("newProbeOffset: "+self.newProbeOffset.toString());
				self.mgLog("ProbeOffString: "+self.ProbeOffString);
				OctoPrint.control.sendGcode([self.ProbeOffString,
					"M500",
					"M211 S1",
					"G1 F2000 X-20"
				]);
				self.probeOffset(self.newProbeOffset);
				self.requestEeprom();
				if (self.maintenanceOperation()!=="home"){
					self.nextMaintenanceTask();
				}
					//new PNotify({
					//	title: 'Starting Height Adjustment',
					//	text: "Starting Height Set to : "+self.newZOffset.toString(),
					//	type: 'success',
					//});

			}
			if (startingHeightStep == "2-maintenance-rrf") {
				// self.newProbeOffset = (parseFloat(self.probeOffset())+parseFloat(self.ZPos()));
				self.newProbeOffset = (parseFloat(self.probeOffset())+parseFloat(parseFloat(self.ZWiggleHeight())-self.stockZWiggleHeight));

				if (self.newProbeOffset.toString() == "NaN") {
					self.notify("Offset Setting Error","There was an error when setting the Probe Offset.  Please refresh the page and try again.  Support values: self.newProbeOffset="+self.newProbeOffset.toString()+" ; self.probeOffset="+self.probeOffset().toString()+" ; self.ZWiggleHeight="+self.ZWiggleHeight().toString()+" ; self.stockZWiggleHeight="+self.stockZWiggleHeight.toString(), "error");
					self.mgLog("Offset setting error:");
					self.mgLog("self.newProbeOffset = "+self.newProbeOffset.toString());
					self.mgLog("self.probeOffset = "+self.probeOffset().toString());
					self.mgLog("self.ZWiggleHeight = "+self.ZWiggleHeight().toString());
					return;
				}
				//self.newZOffset = self.newZOffset + 0.1 ;

				// G31 P25 X21 Y0 Z0.502  U0
				// self.ProbeOffString = "G31 P25 X21 Y0 Z"+self.newProbeOffset.toString()+" U0";
				self.adminAction('changeRrfConfig','command', {'targetParameter':'probeOffset','newValue':self.newProbeOffset.toString()});
				self.mgLog("newProbeOffset: "+self.newProbeOffset.toString());
				self.mgLog("ProbeOffString: "+self.ProbeOffString);
				self.rrfMaintenanceReport(self.ProbeOffString + "\n"+self.rrfMaintenanceReport());
				// OctoPrint.control.sendGcode([self.ProbeOffString,
				// 	"M500 P31"
				// ]);
				self.probeOffset(self.newProbeOffset);
				self.requestEeprom();
				if (self.maintenanceOperation()!=="home"){
					self.nextMaintenanceTask();
				}
				//self.setupStep("3");
			}

			OctoPrint.control.sendGcode("M114");
		};

		self.coldLevelCheck = function(checkPosition) {
			if (checkPosition === 0){
				OctoPrint.control.sendGcode(["T0",
					"G28",
					"G1 F1000 X100 Y125 Z10"]);
			}
			if (checkPosition === 1){
				OctoPrint.control.sendGcode(["T0",
					"G1 F1000 Z5",
					"G1 F2000 X20 Y50",
					"G1 F1000 Z0"]);
			}
			if (checkPosition === 2){
				OctoPrint.control.sendGcode(["T0",
					"G1 F1000 Z5",
					"G1 F2000 X180 Y20",
					"G1 F1000 Z0"]);
			}
			if (checkPosition === 3){
				OctoPrint.control.sendGcode(["T0",
					"G1 F1000 Z5",
					"G1 F2000 X180 Y230",
					"G1 F1000 Z0"]);
			}
			if (checkPosition === 4){
				OctoPrint.control.sendGcode(["T0",
					"G1 F1000 Z5",
					"G1 F2000 X20 Y200",
					"G1 F1000 Z0"]);
			}

			if (checkPosition === "next"){
				if (self.coldLevelCheckPosition()===4){
					self.coldLevelCheckPosition(1);
				} else {
					self.coldLevelCheckPosition(self.coldLevelCheckPosition() + 1);

				}
				self.coldLevelCheck(self.coldLevelCheckPosition());
			}
		};



												
	// 88888888ba,                             88  
	// 88      `"8b                            88  
	// 88        `8b                           88  
	// 88         88  88       88  ,adPPYYba,  88  
	// 88         88  88       88  ""     `Y8  88  
	// 88         8P  88       88  ,adPPPPP88  88  
	// 88      .a8P   "8a,   ,a88  88,    ,88  88  
	// 88888888Y"'     `"YbbdP'Y'  `"8bbdP"Y8  88  
												
												

		self.stepEightPrepared = ko.observable(false);
		self.extOneNeedsPhysical = ko.observable(false);
		self.stepNineAtPosition = ko.observable(false);
		self.stepNineExtrudersSwitched = ko.observable(false);
		self.stepTenStartHeatingClicked = ko.observable(false);
		self.stepTenFirstWiggleClicked = ko.observable(false);
		self.stepElevenFirstWiggleClicked = ko.observable(false);
		self.stepElevenShowFineAdjustments = ko.observable(false);
		self.stepTwelveSimpleClicked = ko.observable(false);
		self.stepFourteenToHome = ko.observable(true);
		self.stepFifteeenToHome = ko.observable(true);

		self.dualSetupCheckLevel = function(dualCheckLevelStep){

			if (dualCheckLevelStep === 0){

				if (!self.hasProbe()){
					OctoPrint.control.sendGcode(["M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"G28 Z",
						"M218 T1 Z0",
						"M500",
						"G28 X",
						"T0",
						"G28 X",
						"T0",
						"G28",
						"T1",
						"G1 F1000 Y125 Z20",
						"G1 F1800 X220",
						"G1 F1000 Z0.25",
						"G4 P1000",
						"M84 X",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
				} else {
					OctoPrint.control.sendGcode(["M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"G28 Z",
						"M218 T1 Z0",
						"M500",
						// "G28 X",
						// "T0",
						// "G28 X",
						"T0",
						"G28 X Y Z",
						"T1",
						"G1 F1000 Y125 Z20",
						"T0",
						"G1 F2000 X10",
						"T1",
						"G1 F1800 X220",
						"G1 F1000 Z0.25",
						"G4 P1000",
						"M84 X",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
				}

			}




		};



		self.dualRightNozzleAdjust = function(dualRightNozzleAdjustStep){





			if (dualRightNozzleAdjustStep === 0){

				OctoPrint.control.sendGcode(["M300 S1040 P250",
					"M300 S1312 P250", 
					"M300 S1392 P250",
					"G4 P750",
					"M106 S0",

					"M218 T1 Z0",
					"M500",
					"G28 X",
					"T0",
					"G28 X",
					"T0",
					"G28",
					"M400",
					"M300 S1392 P250",
					"M300 S1312 P250", 
					"M300 S1040 P250"
					
				]);
				OctoPrint.printer.extrude(10);
				self.cooldown();
			}

			if (dualRightNozzleAdjustStep === 1){
				OctoPrint.control.sendGcode(["M300 S1040 P250",
					"M300 S1312 P250", 
					"M300 S1392 P250",
					"G4 P750",
					"M106 S0",
					"T1",
					"G92 E0",
					"G1 F200 E-0.5",
					"G92 E0",
					"T0",
					"G28 X",
					"G28",
					"G1 F2000 X100 Y125 Z10",
					"G1 F1400 Z2",
					"M400",
					"M300 S1392 P250",
					"M300 S1312 P250", 
					"M300 S1040 P250"
					
				]);
			}
			if (dualRightNozzleAdjustStep === 2){
				OctoPrint.control.sendGcode(["T1"
				]);
			}
			if (dualRightNozzleAdjustStep === 3){
				OctoPrint.control.sendGcode(["G28 Z",
					"M84"
				]);
				self.goTo("10");
			}
			if (dualRightNozzleAdjustStep === '3-maintenance'){
				OctoPrint.control.sendGcode(["M605 S1",
					"M400",
					"G1 F2000 Z20",
					"T0",
					"M84",
					"M605 S0"
				]);
				self.stepNineAtPosition(false);
				//$('#maintenanceTabs').('#coldZ').tab('show')
				if (self.maintenanceOperation()!=="home"){
					self.nextMaintenanceTask();
				} else {
					$(".nav-tabs a[href='#coldZ']").click();
				}
			}



			if (dualRightNozzleAdjustStep === 'simple'){

				if (!self.hasProbe()){
					OctoPrint.control.sendGcode(["M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"G28 Z",
						"M218 T1 Z0",
						"M500",
						"M605 S0",
						"T0",
						"G28 X",
						"T1",
						"G28 X",
						"M605 S1",
						"G28",
						"T1",
						"G1 F2000 X100 Y155 Z50 E0.001",
						"G1 F1000 Z0",
						"M400",
						"M605 S0",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
					OctoPrint.printer.extrude(10);

				} else {
					OctoPrint.control.sendGcode(["M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"M605 S0",
						"G4 P750",
						"M218 T1 Z0",
						"M500",
						"T0",
						"G28 X",
						"G28 XYZ",
						"G1 F2000 X-20",
						"T1",
						"G1 F2000 X100 Y155 Z50",
						"G1 F1000 Z0",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
					self.requestEeprom();
					self.checkParameters();
					// OctoPrint.printer.extrude(10);
					self.cooldown();
				}

				self.cooldown();

			}
			if (dualRightNozzleAdjustStep === 'simple91a'){
				if (!self.hasProbe()){
					OctoPrint.control.sendGcode(["M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"G28 Z",
						"M218 T1 Z0",
						"M500",
						"M605 S0",
						"T0",
						"G28 X",
						"T1",
						"G28 X",
						"M605 S1",
						"G28",
						"T0",
						"G1 F2000 X100 Y155 Z50 E0.001",
						"G1 F1000 Z0",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
					OctoPrint.printer.extrude(10);
					self.cooldown();
				} else {
					OctoPrint.control.sendGcode(["M300 S1040 P250",
						"M300 S1312 P250", 
						"M300 S1392 P250",
						"G4 P750",
						"T0",
						"G28 XYZ",
						"M218 T1 Z0",
						"M500",
						"M605 S0",
						"T0",
						"G28 X",
						"T1",
						"G28 X",
						"M605 S1",
						"T0",
						"G1 F2000 X100 Y155 Z25 E0.001",
						"G1 F1000 Z0",
						"M400",
						"M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250"
						
					]);
					self.requestEeprom();
					self.checkParameters();
					// OctoPrint.printer.extrude(10);
					self.cooldown();

				}
			}
			if (dualRightNozzleAdjustStep === 'simple91b'){
				OctoPrint.control.sendGcode(["M300 S1040 P250",
					"M300 S1312 P250", 
					"M300 S1392 P250",
					"G4 P750",
					"G1 F2000 Z20",
					"M605 S0",
					"T0",
					"G28 X",
					"M605 S1",
					"T1",
					"G1 F2000 X100 Y155 Z20 E0.001",
					"G1 F1000 Z0",
					"M400",
					"M300 S1392 P250",
					"M300 S1312 P250", 
					"M300 S1040 P250"
					
				]);
				// OctoPrint.printer.extrude(10);
				self.cooldown();

			}
		};

		self.showMaintenanceStep = function(inputStep, inputTab, subTab){
			if(inputStep !== undefined && inputTab !== undefined){
				if (self.maintenancePage() === 14 || self.maintenancePage() === 15){
					self.skipConfirm(false);
						self.calibrationStep(0);
						self.calibrationAxis("X");
						self.sawBinPrinted(false);
						self.stepFourteenToHome(true);
						self.stepFifteeenToHome(true);
				} //TODO - figure out just what the heck is going on above here.  Did I put this in showMaintenanceStep instead of resetStep?
				self.requestEeprom();
				self.checkParameters();
				self.linkingToMaintenance(true);
				if (typeof(inputStep)==="number"){
					self.maintenancePage(inputStep);
				} else {
					// if (inputStep === "hotendReplacement"){
					// 	if (self.isDual()){
					// 		self.maintenancePage();
					// 	} else {
					// 		self.maintenancePage();
					// 	}
					// }
					if (inputStep === "hotBedLevel"){
						if (self.hasProbe()){
							self.maintenancePage(21);
						} else {
							self.maintenancePage(6);
						}
					}

					if (inputStep === "hotZOffset"){
						if (self.hasProbe()){
							self.maintenancePage(200);
						} else {
							self.maintenancePage(41);
						}
					}

				}
				$('.nav-tabs a[href='+'\''+inputTab.toString()+'\']').click();
				
				//return true;
				if (subTab !== undefined){
					self.linkingToMaintenance(true);
					$('.nav-tabs a[href='+'\''+subTab.toString()+'\']').click();
				}
			} else if (inputStep !== undefined){
				self.maintenancePage(inputStep);
			}
			


			//$(".nav-tabs a[href='#coldZ']").click();
		};

		// T0Hot
		// 	Load
		// 		SE
		// 			R0
		// 				T0Hot_T0-SE-R0_SetHot
		// 			R1
		// 				T0Hot_T0-SE-R1_SetHot
		// 		ID
		// 			R0
		// 				T0Hot_T0-ID-R0_SetHot
		// 			R1
		// 				T0Hot_T0-ID-R1_SetHot
		// 	SetHot
		// 		home
		// T0Cold
		// 	SetCold
		// 		SE
		// 			R0
		// 				T0Cold_T0-SE-R0_Load
		// 			R1
		// 				T0Cold_T0-SE-R1_Load
		// 		ID
		// 			R0
		// 				T0Cold_T0-ID-R0_Load
		// 			R1
		// 				T0Cold_T0-ID-R1_Load
		// 	Load
		// 		SE
		// 			R0
		// 				T0Cold_T0-SE-R0_SetHot
		// 			R1
		// 				T0Cold_T0-SE-R1_SetHot
		// 		ID
		// 			R0
		// 				T0Cold_T0-ID-R0_SetHot
		// 			R1
		// 				T0Cold_T0-ID-R1_SetHot
		// 	SetHot
		// 		home
		// T1Hot
		// 	Load
		// 		R0
		// 			T1Hot_T1-ID-R0_SetT1Hot
		// 		R1
		// 			T1Hot_T1-ID-R1_SetT1Hot
		// 	SetT1Hot
		// 		home
		// T1Cold
		// 	Unload
		// 		R0
		// 			T1Cold_T1-ID-R0_SetT1Cold
		// 		R1
		// 			T1Cold_T1-ID-R1_SetT1Cold
		// 	SetT1Cold
		// 		R0
		// 			T1Cold_T1-ID-R0_Load
		// 		R1
		// 			T1Cold_T1-ID-R1_Load
		// 	Load
		// 		R0
		// 			T1Cold_T1-ID-R0_SetT1Hot
		// 		R1
		// 			T1Cold_T1-ID-R1_SetT1Hot
		// 	SetT1Hot
		// 		home
		// XOff
		// 	Load
		// 		R0
		// 			XOff_T1-ID-R0_XSaw
		// 		R1
		// 			XOff_T1-ID-R1_XSaw
		// 	XSaw
		// 		home
		// YOff
		// 	Load
		// 		R0
		// 			YOff_T1-ID-R0_YSaw
		// 		R1
		// 			YOff_T1-ID-R1_YSaw
		// 	YSaw
		// 		home
		// DCheck
		// 	Check
		// 		home
		// T0Change
		// 	Unload
		// 		SE
		// 			R0
		// 				T0Change_T0-SE-R0_ChangeInstructions
		// 			R1
		// 				T0Change_T0-SE-R1_ChangeInstructions
		// 		ID
		// 			R0
		// 				T0Change_T0-ID-R0_ChangeInstructions
		// 			R1
		// 				T0Change_T0-ID-R1_ChangeInstructions
		// 	ChangeInstructions
		// 		SE
		// 			R0
		// 				T0Change_T0-SE-R0_Load
		// 			R1
		// 				T0Change_T0-SE-R1_Load
		// 		ID
		// 			R0
		// 				T0Change_T0-ID-R0_SetCold
		// 			R1
		// 				T0Change_T0-ID-R1_SetCold
		// 	Load
		// 		SE
		// 			R0
		// 				T0Change_T0-SE-R0_SetCold
		// 			R1
		// 				T0Change_T0-SE-R1_SetCold
		// 		ID
		// 			R0
		// 				T0Change_T0-ID-R0_SetHot
		// 			R1
		// 				T0Change_T0-ID-R1_SetHot
		// 	SetCold
		// 		SE
		// 			R0
		// 				T0Change_T0-SE-R0_SetHot
		// 			R1
		// 				T0Change_T0-SE-R1_SetHot
		// 		ID
		// 			R0
		// 				T0Change_T0-ID-R0_Load
		// 			R1
		// 				T0Change_T0-ID-R1_Load
		// 	SetHot
		// 		SE
		// 			home
		// 		ID
		// 			R0
		// 				T0Change_T0-ID-R0_SetT1Hot
		// 			R1
		// 				T0Change_T0-ID-R1_SetT1Hot
		// 	SetT1Hot
		// 		home
		// T0T1Change
		// 	Unload
		// 		R0
		// 			T0T1Change_Both-ID-R0_ChangeInstructions
		// 		R1
		// 			T0T1Change_Both-ID-R1_ChangeInstructions
		// 	ChangeInstructions
		// 		R0
		// 			T0T1Change_Both-ID-R0_T0T1SetCold
		// 		R1
		// 			T0T1Change_Both-ID-R1_T0T1SetCold
		// 	T0T1SetCold
		// 		R0
		// 			T0T1Change_Both-ID-R0_Load
		// 		R1
		// 			T0T1Change_Both-ID-R1_Load
		// 	Load
		// 		R0
		// 			T0T1Change_Both-ID-R0_SetHot
		// 		R1
		// 			T0T1Change_Both-ID-R1_SetHot
		// 	SetHot
		// 		R0
		// 			T0T1Change_Both-ID-R0_SetT1Hot
		// 		R1
		// 			T0T1Change_Both-ID-R1_SetT1Hot
		// 	SetT1Hot
		// 		home
		// HotLevel
		// 	Load
		// 		SE
		// 			HotLevel_T0-SE-R0_HotLevel
		// 		ID
		// 			HotLevel_T0-ID-R0_HotLevel
		// 	HotLevel
		// 		home
		// ColdLevel
		// 	ColdLevel
		// 		home
		// Assisted
		// 	Assisted
		// 		home

		// T1 Hotend / Nozzle Change ID
		// 	Unload Filament
		// 	Change Hotend Instructions
		// 	Set T1 Starting Height Cold
		// 	Load Filament
		// 	Set T1 Z Offset Hot
		// R0
		// 	Unload Filament
		// 		T1Change_T1-ID-R0_Unload
		// 	Change Hotend Instructions
		// 		T1Change_T1-ID-R0_ChangeInstructions
		// 	Set T0 Starting Height Cold
		// 		T1Change_T1-ID-R0_SetT1Cold
		// 	Load Filament
		// 		T1Change_T1-ID-R0_Load
		// 	Set T1 Z Offset Hot
		// 		T1Change_T1-ID-R0_SetT1Hot
		// R1
		// 	Unload Filament
		// 		T1Change_T1-ID-R1_Unload
		// 	Change Hotend Instructions
		// 		T1Change_T1-ID-R1_ChangeInstructions
		// 	Set T1 Starting Height Cold
		// 	T1Change_T1-ID-R1_SetCold
		// 	Load Filament
		// 		T1Change_T1-ID-R1_Load
		// 	Set T1 Z Offset Hot
		// 		T1Change_T1-ID-R1_SetT1Hot













		self.maintenanceOperation = ko.observable("home");
		self.maintenanceTaskPrinterType = ko.observable("");
		self.maintenanceTaskHardwareRevision = ko.observable("");
		self.maintenanceTaskHotend = ko.observable("");
		self.maintenanceTask = ko.observable("");
		self.shownTask = ko.observable("home");
		self.taskRadio = ko.observable("home");
		self.validTask = ko.observable(true);
		self.validTaskList = ["T0-SE-R1_Assisted","Both-ID-R0_ChangeInstructions","Both-ID-R0_Load","Both-ID-R0_SetHot","Both-ID-R0_SetT1Hot","Both-ID-R0_T0T1SetCold","Both-ID-R1_ChangeInstructions","Both-ID-R1_Load","Both-ID-R1_SetHot","Both-ID-R1_SetT1Hot","Both-ID-R1_T0T1SetCold","T0-ID-R0_ChangeInstructions","T0-ID-R0_HotLevel","T0-ID-R0_Load","T0-ID-R0_SetCold","T0-ID-R0_SetHot","T0-ID-R0_SetT1Hot","T0-ID-R1_ChangeInstructions","T0-ID-R1_Load","T0-ID-R1_SetCold","T0-ID-R1_SetHot","T0-ID-R1_SetT1Hot","T0-SE-R0_ChangeInstructions","T0-SE-R0_HotLevel","T0-SE-R0_Load","T0-SE-R0_SetCold","T0-SE-R0_SetHot","T0-SE-R1_ChangeInstructions","T0-SE-R1_Load","T0-SE-R1_SetCold","T0-SE-R1_SetHot","T1-ID-R0_Load","T1-ID-R0_SetT1Cold","T1-ID-R0_SetT1Hot","Both-ID-R0_XSaw","Both-ID-R0_YSaw","T1-ID-R1_Load","T1-ID-R1_SetT1Cold","T1-ID-R1_SetT1Hot","Both-ID-R1_XSaw","Both-ID-R1_YSaw","T1-ID-R0_Unload","TT1-ID-R0_ChangeInstructions","T1-ID-R0_SetT1Cold","T1-ID-R0_Load","T1-ID-R0_SetT1Hot","T1-ID-R1_Unload","T1-ID-R1_ChangeInstructions","T1-ID-R1_Load","T1-ID-R1_SetT1Hot","Both-ID-R0_SetCold","Both-ID-R1_SetCold","Both-ID-R0_SetT1Cold","Both-ID-R1_SetT1Cold","Both-ID-R1_UpgradeSoftware","Both-ID-R1_ProbeCheck","Both-ID-R1_ProbeWiring","Both-ID-R1_ProbePhysical"];

		self.updateTask = function(){
			if (self.shownTask() === 'home'){
				self.taskRadio('home');
				self.validTask(true);
				return;
			}
			if (self.maintenanceTaskPrinterType() !== undefined && self.maintenanceTaskHardwareRevision() !== undefined && self.maintenanceTaskHotend() !== undefined && self.shownTask() !== undefined){
				self.taskRadio(self.maintenanceTaskHotend()+"-"+self.maintenanceTaskPrinterType()+"-"+self.maintenanceTaskHardwareRevision()+"_"+self.shownTask());
				self.maintenanceOperation("home");
				self.mgLog(self.taskRadio());
				if (self.validTaskList.indexOf(self.taskRadio())===-1){
					self.validTask(false);
					self.mgLog("Not a valid task combination.");
				} else {
					self.validTask(true);
				}

			}



		};

		self.nextMaintenanceTask = function(nextTask){
			self.mgLog("nextMaintenanceTask called with: "+nextTask);
			if (self.isPrinting()){
				// self.notify("Printing","Maintenance Tasks can not be performed while a print is running.  Please either cancel the print or wait until it finishes before trying to perform any Maintenance Tasks.","error");
				self.mgLog("nextMaintenanceTask called while printing, returning.");
				return;
			}
			if (nextTask === "home"){
				self.maintenanceOperation("home");
				self.maintenanceTaskPrinterType("");
				self.maintenanceTaskHardwareRevision("");
				self.maintenanceTaskHotend("");
				self.maintenanceTask("");
				self.shownTask("home");
				self.taskRadio("home");
				return;
			}

			if (nextTask !== undefined){
				// self.shownTask(nextTask);
				var taskSplit = nextTask.split("_");
				self.maintenanceOperation(taskSplit[0]);
				self.maintenanceTask(taskSplit[2]);
				self.shownTask(taskSplit[2]);
				self.taskRadio(nextTask);
				// shownTaskRegular = self.shownTask();

				if (taskSplit[1].includes("T0")){self.maintenanceTaskHotend("T0");}
				if (taskSplit[1].includes("T1")){self.maintenanceTaskHotend("T1");}
				if (taskSplit[1].includes("Both")){self.maintenanceTaskHotend("Both");}

				if (taskSplit[1].includes("R0")){self.maintenanceTaskHardwareRevision("R0");} else {self.maintenanceTaskHardwareRevision("R1");}
				if (taskSplit[1].includes("SE")){self.maintenanceTaskPrinterType("SE");} else {self.maintenanceTaskPrinterType("ID");}

				switch(self.maintenanceTask()){ //put any extra commands that should be run any time a given task is called here; for instance, reseting the customWiggle selection on SetHot and SetT1Hot.

					case "SetHot":
						self.customWiggle(undefined);
						self.stepTwentyFirstWiggleClicked(false);
						self.requestEeprom();
						break;

					case "SetT1Hot":
						self.customWiggle(undefined);
						self.stepTwentyFirstWiggleClicked(false);
						self.stepElevenFirstWiggleClicked(false);
						self.requestEeprom();
						break;

					case "Assisted":
						self.probeLevelFirstCheckClicked(false);
						self.noTurns(false);
						self.probeCheckReset();
						break;

					case "Load":
						self.stepThreeStartHeatingClicked(false);
						self.requestEeprom();
						break;

					case "SetHot":
						self.stepElevenFirstWiggleClicked(false);
						self.stepTwentyFirstWiggleClicked(false);
						self.stepFourShowFineAdjustments(false);
						self.stepTwentyShowFineAdjustments(false);
						break;

					case "SetCold":
						self.stepTwoPrepared(false);
						self.stepTwoStartingHeightSaved(false);					
						self.requestEeprom();
						break;

					case "SetT1Hot":
						self.stepElevenFirstWiggleClicked(false);
						self.stepElevenShowFineAdjustments(false);
						self.requestEeprom();
						break;

					case "SetT1Cold":
						self.stepNineAtPosition(false);
						self.requestEeprom();
						break;

					case "XSaw":
						self.calibrationStep(0);
						self.sawBinPrinted(false);
						self.chosenSawBin(0);
						self.skipConfirm(false);
						self.calibrationStep(0);
						self.calibrationAxis("X");
						self.sawBinPrinted(false);
						self.sawPrintOffset(0);
						self.stepFourteenToHome(true);
						self.stepFifteeenToHome(true);
						self.requestEeprom();
						break;

					case "YSaw":
						self.calibrationStep(0);
						self.sawBinPrinted(false);
						self.chosenSawBin(0);
						self.skipConfirm(false);
						self.calibrationStep(0);
						self.calibrationAxis("Y");
						self.sawBinPrinted(false);
						self.sawPrintOffset(0);
						self.stepFourteenToHome(true);
						self.stepFifteeenToHome(true);
						self.requestEeprom();
						break;

					case "ChangeInstructions":
						self.hotendSwapComplete(false);
						break;

					case "T0T1SetCold":
						self.stepNineAtPosition(false);
						self.requestEeprom();
						break;

					case "HotLevel":
						self.stepSixWigglePrinted(false);
						self.stepSixPrepared(false);
						self.requestEeprom();
						break;

					case "UpgradeSoftware":
						self.softwareUpgraded(false);
						self.commandResponse("");


				}


			} else {

				
				switch(self.maintenanceOperation()){
					case undefined:
						self.mgLog("nextMaintenanceTask called without nextTask, and maintenanceOperation() is not defined - error during debugging?");
						return;

					case "T0Hot":
						switch(self.maintenanceTask()){
							case "Load":
								switch(self.maintenanceTaskPrinterType()){
									case "SE":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Hot_T0-SE-R0_SetHot");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Hot_T0-SE-R1_SetHot");
												break;
										}
										break;

									case "ID":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Hot_T0-ID-R0_SetHot");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Hot_T0-ID-R1_SetHot");
												break;
										}
								}
								break;

							case "SetHot":
								self.nextMaintenanceTask("home");
								break;
						}
						break;


					case "PrinterUpgrade":
						switch(self.maintenanceTask()){

							case "UpgradeSoftware":
								self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_ProbeCheck");
								break;
							case "ProbeWiring":
								self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_ProbeCheck");
								break;
							case "ProbePhysical":
								self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_ProbeCheck");
								break;
							case "ProbeCheck":
								self.nextMaintenanceTask("Assisted");
								break;
							case "Assisted":
								self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_SetCold");
								break;
							case "SetCold":
								self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_SetT1Cold");
								break;
							case "SetT1Cold":
								self.nextMaintenanceTask("PrinterUpgrade_T0-ID-R1_Load");
								break;
							case "Load":
								switch(self.maintenanceTaskHotend()){
									case "T0":
										self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_SetHot");
										break;
									case "T1":
										self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_SetT1Hot");
										break;
								}
								break;
							case "SetHot":
								self.nextMaintenanceTask("PrinterUpgrade_T1-ID-R1_Load");
								break;
							case "SetT1Hot":
								self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_XSaw");
								break;
							case "XSaw":
								self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_YSaw");
								break;
							case "YSaw":
								self.nextMaintenanceTask("home");
								self.cooldown();
								break;
						}
						break;




					case "T0Cold":
						switch(self.maintenanceTask()){
							case "SetCold":
								switch(self.maintenanceTaskPrinterType()){
									case "SE":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Cold_T0-SE-R0_Load");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Cold_T0-SE-R1_Load");
												break;
										}
										break;

									case "ID":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Cold_T0-ID-R0_Load");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Cold_T0-ID-R1_Load");
												break;
										}
								}
								break;

								
							case "Load":
								switch(self.maintenanceTaskPrinterType()){
										case "SE":
											switch(self.maintenanceTaskHardwareRevision()){
												case "R0":
													self.nextMaintenanceTask("T0Cold_T0-SE-R0_SetHot");
													break;
												case "R1":
													self.nextMaintenanceTask("T0Cold_T0-SE-R1_SetHot");
													break;
											}
											break;

										case "ID":
											switch(self.maintenanceTaskHardwareRevision()){
												case "R0":
													self.nextMaintenanceTask("T0Cold_T0-ID-R0_SetHot");
													break;
												case "R1":
													self.nextMaintenanceTask("T0Cold_T0-ID-R1_SetHot");
													break;
											}
									}

								break;

							case "SetHot":
								self.nextMaintenanceTask("home");

								break;

						}

						break;

					case "T1Hot":
						switch(self.maintenanceTask()){
							case "Load":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T1Hot_T1-ID-R0_SetT1Hot");
										break;
									case "R1":
										self.nextMaintenanceTask("T1Hot_T1-ID-R1_SetT1Hot");
										break;
								}
								break;

							case "SetT1Hot":
								self.nextMaintenanceTask("home");
								break;
						}
						break;

					case "T1Cold":
						switch(self.maintenanceTask()){
							case "Unload":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T1Cold_T1-ID-R0_SetT1Cold");
										break;
									case "R1":
										self.nextMaintenanceTask("T1Cold_T1-ID-R1_SetT1Cold");
										break;
								}

								break;

							case "SetT1Cold":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T1Cold_T1-ID-R0_Load");
										break;
									case "R1":
										self.nextMaintenanceTask("T1Cold_T1-ID-R1_Load");
										break;
								}

								break;

							case "Load":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T1Cold_T1-ID-R0_SetT1Hot");
										break;
									case "R1":
										self.nextMaintenanceTask("T1Cold_T1-ID-R1_SetT1Hot");
										break;
								}

								break;

							case "SetT1Hot":
								self.nextMaintenanceTask("home");

								break;
						}

						break;

					case "XOff":
						switch(self.maintenanceTask()){
							case "Load":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("XOff_Both-ID-R0_XSaw");
										break;
									case "R1":
										self.nextMaintenanceTask("XOff_Both-ID-R1_XSaw");
										break;
								}
								break;

							case "XSaw":
								self.nextMaintenanceTask("home");
								break;
						}
						break;

					case "YOff":
						switch(self.maintenanceTask()){
							case "Load":
								switch(self.maintenanceTaskHardwareRevision()){
										case "R0":
											self.nextMaintenanceTask("YOff_Both-ID-R0_YSaw");
											break;
										case "R1":
											self.nextMaintenanceTask("YOff_Both-ID-R1_YSaw");
											break;
								}
								break;

							case "YSaw":
								self.nextMaintenanceTask("home");
								break;
						}
						break;

					case "DCheck":
						switch(self.maintenanceTask()){
							case "Check":
								self.nextMaintenanceTask("home");
								break;
						}
						break;

					case "T0Change":
						switch(self.maintenanceTask()){
							case "Unload":
								switch(self.maintenanceTaskPrinterType()){
									case "SE":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Change_T0-SE-R0_ChangeInstructions");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Change_T0-SE-R1_ChangeInstructions");
												break;
										}
										break;

									case "ID":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Change_T0-ID-R0_ChangeInstructions");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Change_T0-ID-R1_ChangeInstructions");
												break;
										}
								}
								break;

							case "ChangeInstructions":
								switch(self.maintenanceTaskPrinterType()){
									case "SE":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Change_T0-SE-R0_SetCold");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Change_T0-SE-R1_SetCold");
												break;
										}
										break;

									case "ID":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Change_T0-ID-R0_SetCold");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Change_T0-ID-R1_SetCold");
												break;
										}
								}

								break;

							case "SetCold":
								switch(self.maintenanceTaskPrinterType()){
									case "SE":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Change_T0-SE-R0_Load");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Change_T0-SE-R1_Load");
												break;
										}
										break;

									case "ID":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Change_T0-ID-R0_Load");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Change_T0-ID-R1_Load");
												break;
										}
								}
								break;


							case "Load":
								switch(self.maintenanceTaskPrinterType()){
									case "SE":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Change_T0-SE-R0_SetHot");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Change_T0-SE-R1_SetHot");
												break;
										}
										break;

									case "ID":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Change_T0-ID-R0_SetHot");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Change_T0-ID-R1_SetHot");
												break;
										}
								}
								break;


							case "SetHot":
								switch(self.maintenanceTaskPrinterType()){
									case "SE":
										self.nextMaintenanceTask("home");
										break;

									case "ID":
										switch(self.maintenanceTaskHardwareRevision()){
											case "R0":
												self.nextMaintenanceTask("T0Change_T0-ID-R0_SetT1Hot");
												break;
											case "R1":
												self.nextMaintenanceTask("T0Change_T0-ID-R1_SetT1Hot");
												break;
										}
								}
								break;

							case "SetT1Hot":
								self.nextMaintenanceTask("home");
								break;
						}
						break;

					case "T1Change":
						switch(self.maintenanceTask()){
							case "Unload":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T1Change_T1-ID-R0_ChangeInstructions");
										break;
									case "R1":
										self.nextMaintenanceTask("T1Change_T1-ID-R1_ChangeInstructions");
										break;
								}
								break;

							case "ChangeInstructions":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T1Change_T1-ID-R0_SetCold");
										break;
									case "R1":
										self.nextMaintenanceTask("T1Change_T1-ID-R1_SetCold");
										break;
								}
								break;

							case "Load":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T1Change_T1-ID-R0_SetHot");
										break;
									case "R1":
										self.nextMaintenanceTask("T1Change_T1-ID-R1_SetHot");
										break;
								}
								break;

							case "SetT1Hot":
								self.nextMaintenanceTask("home");
								break;
						}
						break;

					case "T0T1Change":
						switch(self.maintenanceTask()){
							case "Unload":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R0_ChangeInstructions");
										break;
									case "R1":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R1_ChangeInstructions");
										break;
								}

								break;

							case "ChangeInstructions":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R0_SetCold");
										break;
									case "R1":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R1_SetCold");
										break;
								}
								break;

							case "SetCold":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R0_SetT1Cold");
										break;
									case "R1":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R1_SetT1Cold");
										break;
								}
								break;


							case "SetT1Cold":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0"
:										self.nextMaintenanceTask("T0T1Change_Both-ID-R0_Load");
										break;
									case "R1":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R1_Load");
										break;
								}
								break;

							case "Load":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R0_SetHot");
										break;
									case "R1":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R1_SetHot");
										break;
								}
								break;

							case "SetHot":
								switch(self.maintenanceTaskHardwareRevision()){
									case "R0":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R0_SetT1Hot");
										break;
									case "R1":
										self.nextMaintenanceTask("T0T1Change_Both-ID-R1_SetT1Hot");
										break;
								}
								break;

							case "SetT1Hot":
								self.nextMaintenanceTask("home");
								break;
						}
						break;

					case "HotLevel":
						switch(self.maintenanceTask()){
							case "Load":
								switch(self.maintenanceTaskPrinterType()){
									case "SE":
										self.nextMaintenanceTask("HotLevel_T0-SE-R0_HotLevel");
										break;
									case "ID":
										self.nextMaintenanceTask("HotLevel_T0-ID-R0_HotLevel");
										break;
								}
								break;

							case "HotLevel":
								self.nextMaintenanceTask("home");
								break;
						}
						break;

					case "ColdLevel":
						switch(self.maintenanceTask()){
							case "ColdLevel":
								self.nextMaintenanceTask("home");
								break;
						}
						break;

					case "Assisted":
						switch(self.maintenanceTask()){
							case "Assisted":
								self.nextMaintenanceTask("home");
								break;
						}
						break;
				}
			}
		};










		self.skipConfirm = ko.observable(false);
		self.calibrationStep = ko.observable(0);
		self.calibrationAxis = ko.observable("X");
		self.calibrationOffset = ko.pureComputed(function(){
			if (self.calibrationStep() === 0){
				return 0.25;
			} else if (self.calibrationStep() === 1){
				return 0.1;
			} else if (self.calibrationStep() === 2){
				return 0.05;
			}
		},this);
		self.sawPrintOffset = ko.observable(0);
		self.sawBinPrinted = ko.observable(false);
		self.chosenSawBin = ko.observable(0);


		// For future sanity, some notes on how the X and Y offset adjustment works.  It's a bit convoluted, but is a delicate balance between simplicity and flexibility.
		// The entire process revovles around printing a pattern with the two hotends, and having the user select the pattern feature where the pattern is closest to aligned; this is repeated until the central feature is selected,
		// and then repeated with a pattern with smaller spacings twice.
		// There are 5 potential choices - originaly, selecting 1,2,4 or 5 would adjust the axis offset and ask the user to reprint the same pattern, while selecting 3 would move to either the next pattern granularity or axis.
		// On 9/26/2017 we changed this behavior so that 2 and 4 also move to the next granularity, but _only_ if not the final granularity.

		// Actual process - user clicks one of the buttons (1,2,3,4,5), which triggers printSawBinConfirm(2) or whatever number is selected.  printSawBinConfirm() takes in that number, saves it if actually provided, then either
		// calls pickSawBin() if we're on calibrationStep() 2 and the chosenBin was 3, or pops up the printSawBinDialog to confirm with the user that the bed is clear and thus ready to print again.
		// The printSawBinDialog has just two options - Cancel or Print; Print calls pickSawBin().

		// pickSawBin() filters through the input based on if the calibrationAxis is X or Y, then on what bin was chosen, and then what calibrationStep is active.
		// Behavior for X and Y, if the user selects 1,2,4, or 5, is the same - adjust the offset by that value, then call printSawBin; new version will also increment calibrationStep if 2 or 4 are selected.
		// If bin is 3, increment calibrationStep; if calibrationStep is no 3, either finish the X adjustment process and move to the Y adjustment, or finish the Y adjustment process, depending on calibrationAxis();
		// if calibrationStep is still below 3, printSawBin().

		// printSawBin() prints whatever pattern is called for based on calibrationAxis and calibrationStep.





		self.printSawBinConfirm = function(chosenBin){
			

			if (chosenBin !== undefined){
				self.chosenSawBin(chosenBin);
			}
			if (self.calibrationStep() === 2 && chosenBin === 3){
				self.pickSawBin();
			} else {
				self.printSawBinDialog.modal("show");
			}
		};

		self.printSawBin = function(){
			self.rrfMaintenanceReport("Starting the dual offset adjustment.\n"+self.rrfMaintenanceReport());
			var parameters;
			var context;
			self.mgLog("Print Saw Bin triggered. Calibration Step: "+self.calibrationStep().toString()+" . Calibration Axis: "+self.calibrationAxis().toString()+" .");
			if (self.calibrationAxis()=="X"){
				if (self.calibrationStep() === 0){
					if (self.stepFourteenToHome()){
						parameters = {tohome: true, offset: self.sawPrintOffset()};
					} else {
						parameters = {offset: self.sawPrintOffset()};
					}
					context = {};
					// OctoPrint.control.sendGcodeScriptWithParameters("bin025", context, parameters);
					if (self.rrf()){
						OctoPrint.control.sendGcodeScriptWithParameters("Xsaw025Rrf", context, parameters);
					} else {
						OctoPrint.control.sendGcodeScriptWithParameters("Xsaw025", context, parameters);
					}
					self.stepFourteenToHome(false);
				}
				if (self.calibrationStep() === 1){
					parameters = {offset: self.sawPrintOffset()};
					context = {};
					if (self.rrf()){
						OctoPrint.control.sendGcodeScriptWithParameters("saw01Rrf", context, parameters);
					} else {
						OctoPrint.control.sendGcodeScriptWithParameters("saw01", context, parameters);
					}
				}
				if (self.calibrationStep() === 2){
					parameters = {offset: self.sawPrintOffset()};
					context = {};
					if (self.rrf()){
						OctoPrint.control.sendGcodeScriptWithParameters("saw005Rrf", context, parameters);
					} else {
						OctoPrint.control.sendGcodeScriptWithParameters("saw005", context, parameters);
					}
				}
			}
			if (self.calibrationAxis()=="Y"){
				if (self.calibrationStep() === 0){
					if (self.stepFifteeenToHome()){
						// parameters = {tohome: true, offset: self.sawPrintOffset()};
						parameters = {tohome: true, offset: 0};
					} else {
						//parameters = {offset: self.sawPrintOffset()};
						parameters = {offset: 0};
					}
					context = {};
					// OctoPrint.control.sendGcodeScriptWithParameters("Ybin025", context, parameters);
					if (self.rrf()){
						OctoPrint.control.sendGcodeScriptWithParameters("Ysaw025Rrf", context, parameters);
					} else {
						OctoPrint.control.sendGcodeScriptWithParameters("Ysaw025", context, parameters);
					}
					self.stepFifteeenToHome(false);
				}
				if (self.calibrationStep() === 1){
					// parameters = {offset: self.sawPrintOffset()};
					parameters = {offset: 0};
					context = {};
					if (self.rrf()){
						OctoPrint.control.sendGcodeScriptWithParameters("Ysaw01Rrf", context, parameters);
					} else {
						OctoPrint.control.sendGcodeScriptWithParameters("Ysaw01", context, parameters);
					}
				}
				if (self.calibrationStep() === 2){
					// parameters = {offset: self.sawPrintOffset()};
					parameters = {offset: 0};
					context = {};
					if (self.rrf()){
						OctoPrint.control.sendGcodeScriptWithParameters("Ysaw005Rrf", context, parameters);
					} else {
						OctoPrint.control.sendGcodeScriptWithParameters("Ysaw005", context, parameters);
					}
				}
			}
			self.sawBinPrinted(true);
			self.enableLockedButton(10000);
		};

		self.pickSawBin = function(chosenMatch){
			if (chosenMatch === undefined){
				chosenMatch = self.chosenSawBin();
			}
			if (self.rrf()){
				self.toolOffsetCommand = "G10 P1 ";
				self.xIdentifier = "U";
			} else {
				self.toolOffsetCommand = "M218 T1 ";
				self.xIdentifier = "X";
			}
			if (self.calibrationAxis()=="X"){
				if (chosenMatch === 0){
					self.printSawBin();
				}
				if (chosenMatch === 1){
					self.mgLog("PickSawBin 1, X.");
					self.newT1XOffset = ((self.tool1XOffset()+(2*self.calibrationOffset())).toFixed(2).toString());
					self.sawPrintOffset(self.sawPrintOffset() + (-2*self.calibrationOffset()));
					self.lastT1Offset(self.newT1XOffset);
					if (self.rrf()){
						self.rrfMaintenanceReport("New T1 X Offset: "+self.newT1XOffset.toString()+"\n"+self.rrfMaintenanceReport());
						OctoPrint.control.sendGcode([self.toolOffsetCommand+self.xIdentifier+self.newT1XOffset]);	
					} else {
						OctoPrint.control.sendGcode([self.toolOffsetCommand+self.xIdentifier+self.newT1XOffset,
							"M500",
							"M503"]);
					}
					self.printSawBin();
				}
				if (chosenMatch === 2){
					self.mgLog("PickSawBin 2, X.");
					self.newT1XOffset = ((self.tool1XOffset()+(1*self.calibrationOffset())).toFixed(2).toString());
					self.sawPrintOffset((self.sawPrintOffset() + (-1*self.calibrationOffset())));
					self.lastT1Offset(self.newT1XOffset);
					
					if (self.rrf()){
						self.rrfMaintenanceReport("New T1 X Offset: "+self.newT1XOffset.toString()+"\n"+self.rrfMaintenanceReport());
						OctoPrint.control.sendGcode([self.toolOffsetCommand+self.xIdentifier+self.newT1XOffset]);	
					} else {
						OctoPrint.control.sendGcode([self.toolOffsetCommand+self.xIdentifier+self.newT1XOffset,
							"M500",
							"M503"]);
					}
					if(self.calibrationStep()<2){self.calibrationStep(self.calibrationStep()+1);}
					self.printSawBin();
				}
				if (chosenMatch === 3){
					self.mgLog("PickSawBin 3, X.");
					// self.newT1XOffset = ((self.tool1XOffset()+(0*self.calibrationOffset())).toString());
					// OctoPrint.control.sendGcode(["M218 T1 X"+self.newT1XOffset,
					// 	"M500",
					// 	"M503"]);
					self.calibrationStep(self.calibrationStep()+1);
					if (self.calibrationStep() === 3){
						if (self.rrf()){
							self.rrfMaintenanceReport("Final T1 X Offset: "+self.lastT1Offset().toString()+"\n"+self.rrfMaintenanceReport());
							self.adminAction('changeRrfConfig','command', {'targetParameter':'t1OffsetX','newValue':self.lastT1Offset().toString()});
							
						}
						self.lastT1Offset(0.0);
						self.calibrationAxis("Y");
						self.calibrationStep(0);
						self.sawBinPrinted(false);
						self.stepFourteenToHome(true);
						self.stepFifteeenToHome(true);
						self.sawPrintOffset(0);
						if (self.maintenanceOperation()!=="home"){
							self.nextMaintenanceTask();
							self.chosenSawBin(0);
							self.resetStep(14);
							self.resetStep(15);
							return;
						}
						if (self.maintenancePage() === 14){
							self.maintenancePage(0);
						} else {
							self.goTo("15");
						}
					} else{
						self.printSawBin();
					}
				}
				if (chosenMatch === 4){
					self.mgLog("PickSawBin 4, X.");
					self.newT1XOffset = ((self.tool1XOffset()+(-1*self.calibrationOffset())).toFixed(2).toString());
					self.sawPrintOffset((self.sawPrintOffset() + (1*self.calibrationOffset())));
					self.lastT1Offset(self.newT1XOffset);
					if (self.rrf()){
						self.rrfMaintenanceReport("New T1 X Offset: "+self.newT1XOffset.toString()+"\n"+self.rrfMaintenanceReport());
						OctoPrint.control.sendGcode([self.toolOffsetCommand+self.xIdentifier+self.newT1XOffset]);	
					} else {
						OctoPrint.control.sendGcode([self.toolOffsetCommand+self.xIdentifier+self.newT1XOffset,
							"M500",
							"M503"]);
					}
					if(self.calibrationStep()<2){self.calibrationStep(self.calibrationStep()+1);}
					self.printSawBin();
				}
				if (chosenMatch === 5){
					self.mgLog("PickSawBin 5, X.");
					self.newT1XOffset = ((self.tool1XOffset()+(-2*self.calibrationOffset())).toFixed(2).toString());
					self.sawPrintOffset((self.sawPrintOffset() + (2*self.calibrationOffset())));
					self.lastT1Offset(self.newT1XOffset);
					if (self.rrf()){
						self.rrfMaintenanceReport("New T1 X Offset: "+self.newT1XOffset.toString()+"\n"+self.rrfMaintenanceReport());
						OctoPrint.control.sendGcode([self.toolOffsetCommand+self.xIdentifier+self.newT1XOffset]);	
					} else {
						OctoPrint.control.sendGcode([self.toolOffsetCommand+self.xIdentifier+self.newT1XOffset,
							"M500",
							"M503"]);
					}
					self.printSawBin();
				}
			} else if (self.calibrationAxis()=="Y"){
				if (chosenMatch === 0){
					self.printSawBin();
				}
				if (chosenMatch === 1){
					self.mgLog("PickSawBin 1, Y.");
					self.newT1YOffset = ((self.tool1YOffset()+(2*self.calibrationOffset())).toFixed(2).toString());
					self.sawPrintOffset((self.sawPrintOffset() + (-2*self.calibrationOffset())));
					self.lastT1Offset(self.newT1XOffset);
					if (self.rrf()){
						self.rrfMaintenanceReport("New T1 Y Offset: "+self.newT1YOffset.toString()+"\n"+self.rrfMaintenanceReport());
						OctoPrint.control.sendGcode([self.toolOffsetCommand+"Y"+self.newT1YOffset]);	
					} else {
						OctoPrint.control.sendGcode([self.toolOffsetCommand+"Y"+self.newT1YOffset,
							"M500",
							"M503"]);
					}
					self.printSawBin();
				}
				if (chosenMatch === 2){
					self.mgLog("PickSawBin 2, Y.");
					self.newT1YOffset = ((self.tool1YOffset()+(1*self.calibrationOffset())).toFixed(2).toString());
					self.sawPrintOffset((self.sawPrintOffset() + (-1*self.calibrationOffset())));
					self.lastT1Offset(self.newT1XOffset);
					if (self.rrf()){
						self.rrfMaintenanceReport("New T1 Y Offset: "+self.newT1YOffset.toString()+"\n"+self.rrfMaintenanceReport());
						OctoPrint.control.sendGcode([self.toolOffsetCommand+"Y"+self.newT1YOffset]);	
					} else {
						OctoPrint.control.sendGcode([self.toolOffsetCommand+"Y"+self.newT1YOffset,
							"M500",
							"M503"]);
					}
					if(self.calibrationStep()<2){self.calibrationStep(self.calibrationStep()+1);}
					self.printSawBin();
				}
				if (chosenMatch === 3){
					self.mgLog("PickSawBin 3, Y.");
					// self.newT1YOffset = ((self.tool1YOffset()+(0*self.calibrationOffset())).toString());
					// OctoPrint.control.sendGcode(["M218 T1 Y"+self.newT1YOffset,
					// 	"M500",
					// 	"M503"]);
					self.calibrationStep(self.calibrationStep()+1);
					if (self.calibrationStep() === 3){
						if (self.rrf()){
							self.rrfMaintenanceReport("Final T1 Y Offset: "+self.lastT1Offset().toString()+"\n"+self.rrfMaintenanceReport());
							self.adminAction('changeRrfConfig','command', {'targetParameter':'t1OffsetY','newValue':self.lastT1Offset().toString()});
								
						}
						self.lastT1Offset(0.0);
						self.calibrationStep(0);
						self.sawBinPrinted(false);
						self.stepFourteenToHome(true);
						self.stepFifteeenToHome(true);
						self.sawPrintOffset(0);
						if (self.maintenanceOperation()!=="home"){
							self.nextMaintenanceTask();
							self.chosenSawBin(0);
							self.resetStep(14);
							self.resetStep(15);
							return;
						}
						if(!self.hasProbe()){
							self.goTo("16");
						} else {
							self.goTo("22");
						}
						self.cooldown();
						OctoPrint.control.sendGcode(["M84"]);
					} else{
						self.printSawBin();
					}
				}
				if (chosenMatch === 4){
					self.mgLog("PickSawBin 4, Y.");
					self.newT1YOffset = ((self.tool1YOffset()+(-1*self.calibrationOffset())).toFixed(2).toString());
					self.sawPrintOffset((self.sawPrintOffset() + (1*self.calibrationOffset())));
					self.lastT1Offset(self.newT1XOffset);
					if (self.rrf()){
						self.rrfMaintenanceReport("New T1 Y Offset: "+self.newT1YOffset.toString()+"\n"+self.rrfMaintenanceReport());
						OctoPrint.control.sendGcode([self.toolOffsetCommand+"Y"+self.newT1YOffset]);	
					} else {
						OctoPrint.control.sendGcode([self.toolOffsetCommand+"Y"+self.newT1YOffset,
							"M500",
							"M503"]);
					}
					if(self.calibrationStep()<2){self.calibrationStep(self.calibrationStep()+1);}
					self.printSawBin();
				}
				if (chosenMatch === 5){
					self.mgLog("PickSawBin 5, Y.");
					self.newT1YOffset = ((self.tool1YOffset()+(-2*self.calibrationOffset())).toFixed(2).toString());
					self.sawPrintOffset((self.sawPrintOffset() + (2*self.calibrationOffset())));
					self.lastT1Offset(self.newT1XOffset);
					if (self.rrf()){
						self.rrfMaintenanceReport("New T1 Y Offset: "+self.newT1YOffset.toString()+"\n"+self.rrfMaintenanceReport());
						OctoPrint.control.sendGcode([self.toolOffsetCommand+"Y"+self.newT1YOffset]);	
					} else {
						OctoPrint.control.sendGcode([self.toolOffsetCommand+"Y"+self.newT1YOffset,
							"M500",
							"M503"]);
					}
					self.printSawBin();
				}
			}
			self.chosenSawBin(0);
		};


// print bins:

// "were any of the top spikes inside of the bin?"

// if yes, user selects the best bin and center from there to print sawteeth
// if no, user selects closest bin, we center on bin and then print bins again

// to center - if bin 1, add (2*offset); if bin 2, add (1*offset); bin 3, (0*offset); bin 4, (-1*offset); bin 5, (-2*offset) to M218 T1 X offset


                                                               
// 88888888ba                            88                       
// 88      "8b                           88                       
// 88      ,8P                           88                       
// 88aaaaaa8P'  8b,dPPYba,   ,adPPYba,   88,dPPYba,    ,adPPYba,  
// 88""""""'    88P'   "Y8  a8"     "8a  88P'    "8a  a8P_____88  
// 88           88          8b       d8  88       d8  8PP"""""""  
// 88           88          "8a,   ,a8"  88b,   ,a8"  "8b,   ,aa  
// 88           88           `"YbbdP"'   8Y"Ybbd8"'    `"Ybbd8"'  
                                                               
                                                               

//functions and variables for calibration/testing of the probe
//first step is just to verify the probe exists and activates - first test is to send M119, check that
//Z min is not activated, extend and retract the probe, set the M119 test mode, and send M119 again, checking
//that Z min is activated this time
//then run a G30 on the left edge, then in the middle of the bed - Z should be sane (within 0.5mm ?)
// Recv: Bed X: 121.00 Y: 125.00 Z: 0.08
// Recv: X:100.00 Y:125.00 Z:10.90 E:0.00 Count X:8010 Y:10013 Z:10984
// Recv: ok

		self.probeStep = ko.observable(0);
		self.probePresent = ko.observable(-1); //simple tristate: -1 untested, 0 false, 1 true
		self.probeOffset = ko.observable(undefined);
		self.checkingForProbe = ko.observable(0);
		self.autoCheckClicked = ko.observable(false);
		self.waitingForEndstopResponse = ko.observable(false);
		self.waitingForProbeResponse = ko.observable(false);
		self.stepTwentyShowFineAdjustments = ko.observable(false);
		self.stepTwentyFirstWiggleClicked = ko.observable(false);
		self.bedLevelResults = ko.observableArray([]);
		self.frontLeftMm = ko.observable(undefined);
		self.frontRightMm = ko.observable(undefined);
		self.rearLeftMm = ko.observable(undefined);
		self.rearRightMm = ko.observable(undefined);
		self.frontLeftDisplayMm = ko.observable(undefined);
		self.frontRightDisplayMm = ko.observable(undefined);
		self.rearLeftDisplayMm = ko.observable(undefined);
		self.rearRightDisplayMm = ko.observable(undefined);
		self.frontLeftDegrees = ko.observable(undefined);
		self.frontRightDegrees = ko.observable(undefined);
		self.rearLeftDegrees = ko.observable(undefined);
		self.rearRightDegrees = ko.observable(undefined);
		self.frontLeftDisplayDegrees = ko.observable(undefined);
		self.frontRightDisplayDegrees = ko.observable(undefined);
		self.rearLeftDisplayDegrees = ko.observable(undefined);
		self.rearRightDisplayDegrees = ko.observable(undefined);
		self.zLevelError = ko.observable(undefined);
		self.zLevelErrorDisplay = ko.observable(0);
		self.frontLeftTurns = ko.observable(undefined);
		self.frontRightTurns = ko.observable(undefined);
		self.rearLeftTurns = ko.observable(undefined);
		self.rearRightTurns = ko.observable(undefined);
		self.turnArray = ko.observableArray([]); //every now and then I get a little bit lonely
		self.lastCorner = ko.observable(false);
		self.strictBedLeveling = ko.observable(false);


		self.bedPreviewArray = ko.observableArray(undefined);
		self.activePreview = ko.observable(undefined);
		self.failedStep = ko.observable(-1);
		self.frontLeftString = ko.observable("");
		self.frontRightString = ko.observable("");
		self.rearLeftString = ko.observable("");
		self.rearRightString = ko.observable("");
		self.probeLevelFirstCheckClicked = ko.observable(false);
		self.probeLevelActiveCorner = ko.observable(0);
		self.setHomeOffsetFromProbe = ko.observable(false);
		self.bedAdjustmentRounds = ko.observable(0);
		self.noTurns = ko.observable(false); //used for Maintenance Assisted Bed Leveling to determine when we're done, but still let the user continue if they want
		self.checkingBed = ko.observable(false);





		// self.probeCheckActive = ko.observable(-1);


		self.checkProbe = function() {
			self.mgLog("checkProbe called");
			if (self.probeStep() === 0){
				self.mgLog("probeStep: "+self.probeStep().toString());
				self.autoCheckClicked(true);
				// self.probeCheckActive(0);
				//first check - extend and retract probe, reset alarm, enable M119 test mode, check M119 state
				OctoPrint.control.sendGcode(["M300 S1040 P250",
					"M300 S1312 P250", 
					"M300 S1392 P250",
					"G4 P750",
					"M605 S0",
					"M280 P1 S10",
					"M280 P1 S90",
					"M280 P1 S160",
					"M400",
					"M119",
					"M400"]);
				self.waitingForEndstopResponse(true);
				self.probeFail = window.setTimeout(function() {self.probeCheckFailed()},10000);
			}
			if (self.probeStep() === 1){
				self.mgLog("probeStep: "+self.probeStep().toString());
				//second check - extend and retract probe, enable M119 test mode, check M119 state
				OctoPrint.control.sendGcode(["G4 S1",
					"M300 S800 P250",
					"G4 P250",
					"M280 P1 S10",
					"M400",
					"M280 P1 S90",
					"M400",
					"M280 P1 S60",
					"M400",
					"M119"]);
				self.waitingForEndstopResponse(true);
				self.probeFail = window.setTimeout(function() {self.probeCheckFailed()},10000);
			}
			if (self.probeStep() === 2){
				self.mgLog("probeStep: "+self.probeStep().toString());
				//third check - switch to T0, probe off left edge of bed
				OctoPrint.control.sendGcode(["G4 S1",
					"M300 S800 P250",
					"G4 P250",
					"M300 S800 P250",
					"G4 P250",
					"T0",
					"G28 X Y",
					"G1 F2000 X-10 Y125",
					"M400",
					"G92 Z210",
					"G30",
					"G92 Z0",
					"G1 F1000 Z10",
					"M400"]);
				self.waitingForProbeResponse(true);
				self.probeFail = window.setTimeout(function() {self.probeCheckFailed()},60000);
			}
			if (self.probeStep() === 3){
				OctoPrint.control.sendGcode(["G4 S1",
					"M300 S800 P250",
					"G4 P250",
					"M300 S800 P250",
					"G4 P250",
					"M300 S800 P250",
					"G4 P250",
				]);


				self.mgLog("probeStep: "+self.probeStep().toString());
				//fourth check - make sure the M851 Z offset is sane
				if (self.probeOffset()!==undefined && 0>self.probeOffset()>-3 ){
					self.probeStep(4);
					self.checkProbe();
					return;
				} else {
					self.probeCheckReset();
					// self.goTo("24");
					if (self.maintenanceOperation() === "home"){
						self.stepTwentyNineNext("24");
						self.goTo("29");
						self.failedStep(3);
					} else {
						// self.nextMaintenanceTask();
						// self.failedStep(3);
						//TODO - figure out what to do here, exactly...
						self.mgLog("Probe offset wrong in upgrade process.");
					}
					self.mgLog("probeCheck step 3 failed; self.probeOffset() = "+self.probeOffset());
				}

				// OctoPrint.control.sendGcode(["T0",
				// 	"G1 F2000 Z10",
				// 	"M400",
				// 	"G1 F2000 X100 Z10",
				// 	"M400",
				// 	"G30",
				// 	"M400"]);
				// self.waitingForProbeResponse(true);
				// self.probeFail = window.setTimeout(function() {self.probeCheckFailed()},60000);
			}
			if (self.probeStep() === 4){
				self.mgLog("probeStep: "+self.probeStep().toString());
				//final check - run bed level check, either pass to filament loading if good, or fail to bed leveling if bad
				OctoPrint.control.sendGcode(["G4 S1",
					"M300 S800 P250",
					"G4 P250",
					"M300 S800 P250",
					"G4 P250",
					"M300 S800 P250",
					"G4 P250",
					"M300 S800 P250",
					"G4 P250",
					"T0",
					"G28 Z",
					"G28 XY",
					"G1 F2000 Z10",
					"M400",
					"G29 P2",
					"M420 S0",
					"M400",
					"G1 F1000 X100 Y125 Z20 F10000",
					"M84 Y",
					"M400"]);
				self.waitingForProbeResponse(true);
				self.probeFail = window.setTimeout(function() {self.probeCheckFailed()},75000);
			

				OctoPrint.control.sendGcode(["M300 S1392 P250",
						"M300 S1312 P250", 
						"M300 S1040 P250",
						"G4 P750"
				]);

			}


		};


		self.probeCheckFailed = function() {
			self.mgLog("probeCheckFailed triggered.");
			if (self.waitingForEndstopResponse() || self.waitingForProbeResponse()){
				self.mgLog("probeCheckFailed triggered with waiting true.  Probestep: "+self.probeStep().toString());
				if (self.probeStep() <= 2){
					self.failedStep(self.probeStep());
					// self.setupStep('18');
					if (self.maintenanceOperation()==="home"){
						self.goTo("18");
					} else{
						self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_ProbeWiring");
					}
				}
				if (self.probeStep() == 3){
					self.failedStep(self.probeStep());
					// self.setupStep('19');
					if (self.maintenanceOperation()==="home"){
						self.goTo("19");
					} else {
						self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_ProbePhysical");
					}
				}
				if (self.probeStep() === 0 || self.probeStep() === 1 || self.probeStep() === 2 || self.probeStep() === 3){
					self.probeCheckReset();
					self.failedStep(self.probeStep());
				}
				if (self.probeStep() === 4){
					self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_ProbePhysical");
				}
				// if (self.probeStep() === 2){
				// 	self.probeStep(3);
				// 	self.checkProbe();
				// }
				clearTimeout(self.probeFail);





			}
		};

		self.probeCheckReset = function(){
			self.mgLog("probeCheckReset called - resetting stuff.");
			self.probeStep(0);
			self.probePresent(0);
			self.checkingForProbe(0);
			self.waitingForEndstopResponse(false);
			self.waitingForProbeResponse(false);
			self.probeLevelFirstCheckClicked(false);
			self.probeLevelActiveCorner(0);
			self.stepTwentyFirstWiggleClicked(false);
			self.customWiggle(undefined);
			self.setHomeOffsetFromProbe(false);
			self.lastCorner(false);
			self.autoCheckClicked(false);
			self.bedAdjustmentRounds(0);
			self.noTurns(false);


			clearTimeout(self.probeFail);
			return;

		};

		self.zMinReceived = function(line) {
			self.mgLog("zMinReceived called.");
			
			if (self.waitingForEndstopResponse()){
				self.mgLog("zMinReceived while waitingForEndstopResponse is true.");
				self.mgLog("line: "+line);
				
				//self.mgLog(typeof(line));
				if (line.trim() === "z_min: open"){
					self.mgLog("zMinReceived, line:"+line);
					self.mgLog("z_min: open");
					if (self.probeStep()=== 0){
						self.probeStep(1);
						self.waitingForEndstopResponse(false);
						clearTimeout(self.probeFail);
						self.checkProbe();
					}
				}
				if (line.trim() === "z_min: TRIGGERED"){
					self.mgLog("zMinReceived, line:"+line);
					self.mgLog("z_min: TRIGGERED");
					if (self.probeStep()=== 1){
						self.probeStep(2);
						self.probePresent(1);
						self.waitingForEndstopResponse(false);
						clearTimeout(self.probeFail);
						self.checkProbe();
					}
				}
			}
		};

		self.probeReceived = function(line){
			self.mgLog("probeReceived line: "+line);
			clearTimeout(self.probeFail);
			if (self.waitingForProbeResponse() || self.setHomeOffsetFromProbe()){
				self.waitingForProbeResponse(false);
				if (self.probeStep() === 2){
					self.probeStep(3);
					self.processProbeValue(line);
					self.checkProbe();

				} else if (self.probeStep() === 3 || self.setHomeOffsetFromProbe() ){
					var tempProbeValue = self.processProbeValue(line);
					if (tempProbeValue !== undefined){
						if ( -3 < Math.abs(tempProbeValue) < 0){
							self.mgLog("It looks like the probe value is greater than 0 or below -3 - adjusting M851 Offset.");
							// if(self.probeOffset() !== undefined){
							// 	var newHomeOffset = ((parseFloat(tempProbeValue)+parseFloat(self.probeOffset()))*-1).toString();
							// 	OctoPrint.control.sendGcode(["M206 Z"+newHomeOffset,
							// 		"M500",
							// 		"M503"]);
							// 	self.setHomeOffsetFromProbe(false);
							// 	self.mgLog("M206 Z set to:"+newHomeOffset);
							// }

							self.probeCheckReset();
							self.mgLog("probeRecieved");
							if (self.maintenanceOperation()==="home"){
								if(!self.isDual()){
									// self.goTo("23");
									self.stepTwentyNineNext("23");
									self.goTo("29");
								} else {
									// self.goTo("25");
									self.stepTwentyNineNext("25");
									self.goTo("29");
								}
							} else {
								self.nextMaintenanceTask();
							}
							self.failedStep(self.probeStep());
							// if(self.probeStep() === 3){
							// 	self.probeStep(4);
							// 	self.checkProbe();
							// }
						} else {
							// self.mgLog("It looks like the probe value is between 0 and -3 - no adjustment needed.");
							// self.probeStep(4);
							// self.checkProbe();
						}
					}
				}
			}
		};

		self.processProbeValue = function(probeLine){
			self.filter = /([Z]):.*(\d+\.\d+)/;
			var match = self.filter.exec(probeLine);
			if (match !== undefined){
				self.mgLog("processProbeValue match: "+match);
				self.mgLog("match[2]: "+match[2]);
				return parseFloat(match[2]);
			}
		};

		self.probeAction = function(action){
			if (action === 'extend'){
				OctoPrint.control.sendGcode(["M280 P1 S10"]);
			}
			if (action === 'retract'){
				OctoPrint.control.sendGcode(["M280 P1 S90"]);
			}
			if (action === 'selftest'){
				OctoPrint.control.sendGcode(["M280 P1 S120"]);
			}
			if (action === 'resetalarm'){
				OctoPrint.control.sendGcode(["M280 P1 S160"]);
			}
			if (action === 'retest'){
				OctoPrint.control.sendGcode(["M280 P1 S160"]);
				OctoPrint.control.sendGcode(["G1 Z50"]);
				OctoPrint.control.sendGcode(["M400"]);

				OctoPrint.control.sendGcode(["M280 P1 S10"]);
				OctoPrint.control.sendGcode(["M280 P1 S90"]);
				OctoPrint.control.sendGcode(["M280 P1 S10"]);
				OctoPrint.control.sendGcode(["M280 P1 S90"]);
			}
		};


		self.processBedLevel = function(bedLevelLine){
			self.mgLog("processBedLevel started");
				self.checkingBed(false);
			self.filter = /\[\[(.*?)\].*\[(.*?)\].*\[(.*)\]\]/;
			self.xProbeArray = [];
			self.yProbeArray = [];
			self.zProbeArray = [];
			self.xProbeArrayFiltered = [];
			self.yProbeArrayFiltered = [];
			self.zProbeArrayFiltered = [];
			self.probeCorners = [];
			self.zProbeMax = undefined;
			self.zProbeMin = undefined;
			var match = self.filter.exec(bedLevelLine);
			if (match !== undefined){
				self.mgLog("match: "+match);
				self.xProbeArray = match[1].split(",");
				self.yProbeArray = match[2].split(",");
				self.zProbeArray = match[3].split(",");
				self.xProbePoints = 0;
				self.yProbePoints = 0;
				self.zProbePoints = 0;
				var j = 0;
				var i = 0;
				for (i = 0; i < self.xProbeArray.length; i++){
					if (parseFloat(self.xProbeArray[i]) == 777){continue;}
					var newVal = parseFloat(self.xProbeArray[i]);
					if (!self.xProbeArrayFiltered.includes(newVal)){
						self.xProbePoints++;
					}
					self.xProbeArrayFiltered[j] = newVal;
					j++;
				}
				j = 0;
				for (i = 0; i < self.yProbeArray.length; i++){
					if (parseFloat(self.yProbeArray[i]) == 777){continue;}
					var newVal = parseFloat(self.yProbeArray[i]);
					if (!self.yProbeArrayFiltered.includes(newVal)){
						self.yProbePoints++;
					}
					self.yProbeArrayFiltered[j] = newVal;
					// self.mgLog(self.yProbeArrayFiltered[i]);
					j++;
				}
				// j = 0;
				for (i = 0; i < self.zProbeArray.length; i++){
					if (parseFloat(self.zProbeArray[i]) == 777){continue;}
					var newVal = parseFloat(self.zProbeArray[i]);
					if (i === 0){
						self.zProbeMax = newVal;
						self.zProbeMin = newVal;
					} else {
						if (newVal > self.zProbeMax){self.zProbeMax = newVal;} else {if (newVal < self.zProbeMin){self.zProbeMin = newVal;}}
					}
					self.zProbeArrayFiltered[self.zProbePoints] = newVal;
					self.zProbePoints++;
					
					// j++;
				}
				// self.mgLog(self.yProbeArrayFiltered);)
				for (i=0; i< self.xProbeArrayFiltered.length; i++){if(self.xProbeArrayFiltered[i]===undefined){self.xProbeArrayFiltered.splice(i,1);}}
				for (i=0; i< self.yProbeArrayFiltered.length; i++){if(self.yProbeArrayFiltered[i]===undefined){self.yProbeArrayFiltered.splice(i,1);}}
				for (i=0; i< self.zProbeArrayFiltered.length; i++){if(self.zProbeArrayFiltered[i]===undefined){self.zProbeArrayFiltered.splice(i,1);}}
				self.firstCorner = [self.xProbeArrayFiltered[0],self.yProbeArrayFiltered[0],self.zProbeArrayFiltered[0]];
				self.secondCorner = [self.xProbeArrayFiltered[self.xProbePoints-1],self.yProbeArrayFiltered[self.xProbePoints-1],self.zProbeArrayFiltered[self.xProbePoints-1]];
				self.thirdCorner = [self.xProbeArrayFiltered[self.xProbeArrayFiltered.length-self.xProbePoints],self.yProbeArrayFiltered[self.xProbeArrayFiltered.length-self.xProbePoints],self.zProbeArrayFiltered[self.zProbePoints-self.xProbePoints]];
				self.fourthCorner = [self.xProbeArrayFiltered.slice(-1)[0],self.yProbeArrayFiltered.slice(-1)[0],self.zProbeArrayFiltered.slice(-1)[0]];
				self.bedLevelResults.unshift([self.xProbeArrayFiltered,self.yProbeArrayFiltered,self.zProbeArrayFiltered,[self.firstCorner,self.secondCorner,self.thirdCorner,self.fourthCorner],[self.xProbePoints,self.yProbePoints,self.zProbePoints]]);
				self.mgLog("xProbePoints: "+self.xProbePoints);
				self.mgLog("yProbePoints: "+self.yProbePoints);
				self.mgLog("zProbePoints: "+self.zProbePoints);
				//console.log(self.zProbeArray[0]+" "+self.zProbeArray.slice(-1)[0]+" "+self.zProbeArray[self.xProbePoints-1]+" "+self.zProbeArray[self.zProbePoints-self.xProbePoints]);
				self.mgLog("xProbeArray: "+self.xProbeArray);
				self.mgLog("yProbeArray: "+self.yProbeArray);
				self.mgLog("zProbeArray: "+self.zProbeArray);
				self.mgLog("xProbeArrayFiltered: "+self.xProbeArrayFiltered);
				self.mgLog("yProbeArrayFiltered: "+self.yProbeArrayFiltered);
				self.mgLog("zProbeArrayFiltered: "+self.zProbeArrayFiltered);
				self.mgLog("bedLevelResults(): "+self.bedLevelResults());

				// self.bedPreviewArray([[self.zProbeArray[0],self.zProbeArray[self.yProbePoints],self.zProbeArray[(2*self.yProbePoints)]],
				// 					[self.zProbeArray[1],self.zProbeArray[1+self.yProbePoints],self.zProbeArray[1+(2*self.yProbePoints)]],
				// 					[self.zProbeArray[2],self.zProbeArray[2+self.yProbePoints],self.zProbeArray[2+(2*self.yProbePoints)]]]);
			
				// self.bedPreviewArray([
				// 	[self.zProbeArray[0], self.zProbeArray[2]],
				// 	[self.zProbeArray[(2*self.yProbePoints)], self.zProbeArray[2+(2*self.yProbePoints)]]
				// ]); //works, but moving elsewhere


				// console.log(self.zProbeMax + " , " + self.zProbeMin + " ; " + (self.zProbeMax-self.zProbeMin));
				self.frontLeftMm(self.bedLevelResults()[0][3][0][2]);
				self.frontLeftDisplayMm(self.frontLeftMm());
				self.frontRightMm(self.bedLevelResults()[0][3][1][2]);
				self.frontRightDisplayMm(self.frontRightMm());
				self.rearLeftMm(self.bedLevelResults()[0][3][2][2]);
				self.rearLeftDisplayMm(self.rearLeftMm());
				self.rearRightMm(self.bedLevelResults()[0][3][3][2]);
				self.rearRightDisplayMm(self.rearRightMm());
				self.frontLeftDegrees((Math.abs(self.bedLevelResults()[0][3][0][2]) * (360/0.7)).toFixed());
				self.frontRightDegrees((Math.abs(self.bedLevelResults()[0][3][1][2]) * (360/0.7)).toFixed());
				self.rearLeftDegrees((Math.abs(self.bedLevelResults()[0][3][2][2]) * (360/0.7)).toFixed());
				self.rearRightDegrees((Math.abs(self.bedLevelResults()[0][3][3][2]) * (360/0.7)).toFixed());
				self.frontLeftDisplayDegrees(self.frontLeftDegrees());
				self.frontRightDisplayDegrees(self.frontRightDegrees());
				self.rearLeftDisplayDegrees(self.rearLeftDegrees());
				self.rearRightDisplayDegrees(self.rearRightDegrees());
				self.direction = "";
				self.turns = "";
				self.numberWords = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","too many"];
				if (((self.frontLeftDegrees()%90)/90)>=0.75){self.frontLeftTurns(Math.ceil(self.frontLeftDegrees()/90));} else {self.frontLeftTurns(Math.floor(self.frontLeftDegrees()/90));}
				if (((self.frontRightDegrees()%90)/90)>=0.75){self.frontRightTurns(Math.ceil(self.frontRightDegrees()/90));} else {self.frontRightTurns(Math.floor(self.frontRightDegrees()/90));}
				if (((self.rearLeftDegrees()%90)/90)>=0.75){self.rearLeftTurns(Math.ceil(self.rearLeftDegrees()/90));} else {self.rearLeftTurns(Math.floor(self.rearLeftDegrees()/90));}
				if (((self.rearRightDegrees()%90)/90)>=0.75){self.rearRightTurns(Math.ceil(self.rearRightDegrees()/90));} else {self.rearRightTurns(Math.floor(self.rearRightDegrees()/90));}
				self.turnArray([self.frontLeftTurns(),self.frontRightTurns(),self.rearLeftTurns(),self.rearRightTurns()]);

				// self.frontLeftTurns((if (self.frontLeftDegrees()%90)>=0.75) {return Math.ceil(self.frontLeftDegrees()/90);} else {return Math.floor(self.frontLeftDegrees()/90);}) -probably super broken, and not much shorter, but would be fun to test at some point...




				if (self.frontLeftTurns() === 0){
					self.frontLeftString("The front left corner does not need to be adjusted at this time.");
					self.frontLeftMm(0);
				} else {
					if (self.frontLeftMm() < 0){
						self.direction = "counter-clockwise.";
					} else {
						self.direction = "clockwise.";
					}
					if (self.frontLeftTurns() == 1){self.turns = " quarter-turn ";} else {self.turns = " quarter-turns ";}
					// self.frontLeftString("The front left corner needs to be adjusted <strong>"+self.numberWords[(self.frontLeftTurns())] + "</strong>" +self.turns+self.direction);
					self.frontLeftString("The front left corner needs to be adjusted <strong>"+(self.frontLeftTurns().toString()) + "</strong>" +self.turns+self.direction);
				}

				if (self.frontRightTurns() === 0){
					self.frontRightString("The front right corner does not need to be adjusted at this time.");
					self.frontRightMm(0);
				} else {
					if (self.frontRightMm() < 0){
						self.direction = "counter-clockwise.";
					} else {
						self.direction = "clockwise.";
					}
					if (self.frontRightTurns() == 1){self.turns = " quarter-turn ";} else {self.turns = " quarter-turns ";}
					// self.frontRightString("The front right corner needs to be adjusted <strong>"+self.numberWords[(self.frontRightTurns())] + "</strong>" +self.turns+self.direction);
					self.frontRightString("The front right corner needs to be adjusted <strong>"+(self.frontRightTurns().toString()) + "</strong>" +self.turns+self.direction);
				}

				if (self.rearLeftTurns() === 0){
					self.rearLeftString("The rear left corner does not need to be adjusted at this time.");
					self.rearLeftMm(0);
				} else {
					if (self.rearLeftMm() < 0){
						self.direction = "counter-clockwise.";
					} else {
						self.direction = "clockwise.";
					}
					if (self.rearLeftTurns() == 1){self.turns = " quarter-turn ";} else {self.turns = " quarter-turns ";}
					// self.rearLeftString("The rear left corner needs to be adjusted <strong>"+self.numberWords[(self.rearLeftTurns())] + "</strong>" +self.turns+self.direction);
					self.rearLeftString("The rear left corner needs to be adjusted <strong>"+(self.rearLeftTurns().toString()) + "</strong>" +self.turns+self.direction);
				}

				if (self.rearRightTurns() === 0){
					self.rearRightString("The rear right corner does not need to be adjusted at this time.");
					self.rearRightMm(0);
				} else {
					if (self.rearRightMm() < 0){
						self.direction = "counter-clockwise.";
					} else {
						self.direction = "clockwise.";
					}
					if (self.rearRightTurns() == 1){self.turns = " quarter-turn ";} else {self.turns = " quarter-turns ";}
					// self.rearRightString("The rear right corner needs to be adjusted <strong>"+self.numberWords[(self.rearRightTurns())]  + "</strong>" +self.turns+self.direction);
					self.rearRightString("The rear right corner needs to be adjusted <strong>"+(self.rearRightTurns().toString()) + "</strong>" +self.turns+self.direction);
				}
				// self.mgLog("The front left corner needs to move "+self.frontLeftMm()+ "mm or " + self.frontLeftDegrees() + "° " + ((self.frontLeftMm()>0)?"counter-clockwise.":"clockwise."));
				// self.mgLog("The front right corner needs to move "+self.frontRightMm()+ "mm or " + self.frontRightDegrees() + "° " + ((self.frontRightMm()>0)?"counter-clockwise.":"clockwise."));
				// self.mgLog("The rear left corner needs to move "+self.rearLeftMm()+ "mm or " + self.rearLeftDegrees() + "° " + ((self.rearLeftMm()>0)?"counter-clockwise.":"clockwise."));
				// self.mgLog("The rear right corner needs to move "+self.rearRightMm()+ "mm or " + self.rearRightDegrees() + "° " + ((self.rearRightMm()>0)?"counter-clockwise.":"clockwise.")); //commented out this block when changed to zeroing cornerMm value for correct picture display - 1/10/2018
				self.zLevelError(Math.abs(self.zProbeMax-self.zProbeMin));
				self.zLevelErrorDisplay(self.zLevelError().toFixed(3));
				if ((Math.abs(self.zProbeMax)>5 || Math.abs(self.zProbeMin)>5)){
					self.notify("Bed Level Error","Your Bed Level measurement has returned a value that indicates an issue with bed installation or physical interference.  Please check that the printer is setup correctly and try again, or, contact Support about this issue.","error");
				}
				if (self.waitingForProbeResponse()){
					self.waitingForProbeResponse(false);
					clearTimeout(self.probeFail);
					if (self.zLevelError() > 0.175){ //was 0.35mm, changed to 0.175mm 5/2/2018.  Josh
						self.mgLog("Bed is out of level more than 0.175, going to assisted leveling.");
						// self.setupStep("21");
						if (self.maintenanceOperation()==="home"){
							self.goTo("21");
							self.probeCheckReset();
							self.probeLevelFirstCheckClicked(true);
							self.failedStep(self.probeStep());
						} else {
							self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_Assisted");
						}

					} else {
						// self.setupStep("7");
						self.mgLog("process bed level");
						if(!self.isDual()){
							// self.goTo("23");
							self.stepTwentyNineNext("23");
							self.goTo("29");
						} else {
							// self.goTo("25");
							if (self.maintenanceOperation()==="home"){							
								self.stepTwentyNineNext("25");
								self.goTo("29");
							} else {
								self.nextMaintenanceTask("PrinterUpgrade_Both-ID-R1_SetCold");
							}
						}
						self.probeCheckReset();
					}
				}
				if (self.setupStep() === "21" || self.maintenancePage() === 21){
					if (self.bedAdjustmentRounds() >= 3 && self.maintenancePage() !== 21){
						self.mgLog("Adjustment rounds greater than 3: "+self.bedAdjustmentRounds().toString());
						// self.bedConfigDialog.modal("show");
						self.bedConfigDialog.modal({keyboard: true, backdrop: "static", show: true});
					} else {
						self.probeLevelActiveCorner(0);
						self.lastCorner(false);
						self.probeLevelAssist("next");
					}
				} else {
					if (self.maintenanceOperation() === "Assisted" || self.maintenanceTask() === "Assisted"){
						self.probeLevelActiveCorner(0);
						self.lastCorner(false);
						self.probeLevelAssist("next");
					}
				}
			}
			self.mgLog("processBedLevel calling bedPreview");
			if (!self.hideDebug() || self.maintenanceOperation() === "Assisted"){
				self.bedPreview();
			}
		};


		self.probeLevelAssist = function(levelStep){
			self.mgLog("levelStep: "+levelStep);
			if(levelStep === "skipConfig"){ //use this to skip the "Check Bed Configuration" option
				self.probeLevelActiveCorner(0);
				self.lastCorner(false);
				self.probeLevelAssist("next");
				return;
			}
			if(levelStep === 0){
				self.probeCheckReset();
				OctoPrint.control.sendGcode(["T0",
					"G28 XYZ",
					"G29 P2",
					"M420 S0",
					"G1 F6000 X100 Y125",
					"M84 Y"]);
				self.probeLevelFirstCheckClicked(true);
				self.checkingBed(true);
			}
			if(levelStep === 1){
				OctoPrint.control.sendGcode(["T0",
					"G28 Y",
					"G29 P2",
					"M420 S0",
					"G1 F6000 X100 Y125",
					"M84 Y"]);
				self.probeLevelActiveCorner(0);
				self.checkingBed(true);
				return;
			}
			if(levelStep === "next"){
				self.mgLog("turnArray(): "+self.turnArray());
				var nextCorner = self.turnArray().findIndex(function(element){return element > 0;});
				
				if ( nextCorner === -1){ //check if the turn array does NOT contain any more corners to adjust
					if(self.probeLevelActiveCorner() === 0){ //if no corners left to adjust and at position 0, we're done
						self.mgLog("next corner probs.  Pretty sure Kyle wrote this one.  Still not actually sure what it means.");

						// if (self.maintenanceOperation()!=="home"){
						if (self.maintenanceOperation()==="Assisted"){
							// self.nextMaintenanceTask();
							// self.probeLevelFirstCheckClicked(false);
							// self.lastCorner(false);
							// self.probeLevelAssist(1);
							self.noTurns(true);
							return;
						}
						if (self.maintenancePage() === 21){
							self.noTurns(true);
							return;
						}
						if (self.maintenanceOperation()==="home"){
							if(!self.isDual()){
								self.goTo('23');
							} else {
								self.goTo('25');
							}
						} else {
							self.nextMaintenanceTask();
						}
						window.scroll(0,0);
						self.lastCorner(false);
						//self.probeHomeOffsetAdjust();
						return;
					} else { //if at any other corner, we're done for this round, so check bed again and proceed
						self.probeLevelAssist(1);
						self.enableLockedButton(20000);
						self.lastCorner(false);
						return;
					}
				} else { //if we have a corner left to adjust
					self.probeLevelActiveCorner(nextCorner+1);
					self.turnArray()[nextCorner] = 0;
					// if (self.turnArray().findIndex(function(element){return element === -1 ;})){
					if (self.turnArray().findIndex(function(element){return element > 0 ;}) === -1){
						self.lastCorner(true);
						self.bedAdjustmentRounds(self.bedAdjustmentRounds() +1);
					}
					return;
				}
			}
		};

		self.probeHomeOffsetAdjust = function(){
			self.setHomeOffsetFromProbe(true);
			OctoPrint.control.sendGcode(["T0",
				"G28 X Y Z",
				"G1 F6000 X100 Y125 Z30",
				"G30",
				"M400"]);




		};



		self.selectPreview = function(targetPreview){
			if (targetPreview == "first"){
				self.bedPreview(self.bedLevelResults().length-1);
			}

			if (targetPreview == "last"){
				self.bedPreview(0);
			}

			if (targetPreview == "next"){
				if (self.activePreview()-1 > 0){
					self.bedPreview(self.activePreview()-1);
				} else {
					self.bedPreview(0);
				}
			}

			if (targetPreview == "previous"){
				if (self.activePreview() >= self.bedLevelResults().length-1){
					self.bedPreview(self.bedLevelResults().length-1);
				} else {
					self.bedPreview(self.activePreview()+1);
				}
				//self.bedPreview();
			}
		};


		self.bedPreview = function(targetResult){
			self.mgLog("targetResult: "+targetResult);
			if (targetResult === undefined || typeof(targetResult) != "number"){
				targetResult = 0;
			}
			self.mgLog("targetResult again after possibly changing it: "+targetResult);
			self.activePreview(targetResult);

			// self.bedPreviewArray([
			// 		[self.bedLevelResults()[targetResult][3][0][2], self.bedLevelResults()[targetResult][3][1][2]],
			// 		[self.bedLevelResults()[targetResult][3][2][2], self.bedLevelResults()[targetResult][3][3][2]]
			// ]);

			self.bedPreviewArray.removeAll();
//for (i=0; i< self.xProbeArrayFiltered.length; i++){if(self.xProbeArrayFiltered[i]==undefined){self.xProbeArrayFiltered.splice(i);}}
			// self.tempArray = [];
			self.tempZArray = Array.from(self.bedLevelResults()[targetResult][2]);
			// console.log(self.bedLevelResults());
			for (var i=0; i<(self.bedLevelResults()[targetResult][4][1]) ; i++){
				self.tempArray = [];
				for (var j=0; j<self.bedLevelResults()[targetResult][4][0]; j++){
					// console.log(self.tempZArray);
					self.tempArray.push(self.tempZArray.shift());
					//self.tempArray[] = self.bedLevelResults()[targetResult][2][i];
					//self.tempArray.push([(for (k=0; k<self.bedLevelResults()[targetResult][4][0]; k++){return self.bedLevelResults()[targetResult][2][j+i];}]));
					// console.log(self.tempArray);
				}
				self.bedPreviewArray().push(self.tempArray);
				// console.log(self.bedPreviewArray());
			}
			self.mgLog("bedPreviewArray(): "+self.bedPreviewArray());
			// var myDiv = $('#bedPreviewDiv');
			var raw_data = self.bedPreviewArray();
			// var raw_data = self.tempArray;
			//var raw_data = [[1,2,3], [2,3,4], [3,4,5]];

			// var colorscale = [[0.0, 'rgb(0, 242, 242)'],
			// 				[0.08333333333333333, 'rgb(0, 121, 242)'],
			// 				[0.16666666666666666, 'rgb(0, 0, 242)'],
			// 				[0.25, 'rgb(121, 0, 242)'],
			// 				[0.3333333333333333, 'rgb(242, 0, 242)'],
			// 				[0.41666666666666663, 'rgb(242, 0, 121)'],
			// 				[0.5, 'rgb(242, 0, 0)'],
			// 				[0.5833333333333333, 'rgb(242, 121, 0)'],
			// 				[0.6666666666666666, 'rgb(242, 242, 0)'],
			// 				[0.75, 'rgb(121, 242, 0)'],
			// 				[0.8333333333333333, 'rgb(0, 242, 0)'],
			// 				[0.9166666666666666, 'rgb(0, 242, 121)'],
			// 				[1.0, 'rgb(0, 242, 242)']];
			// var colorscale = [[0.0, 'rgb(0, 0, 255)'],
			// 				[0.5, 'rgb(0, 0, 255)'],
			// 				[.99, 'rgb(0, 0, 255)'],
			// 				[1, 'rgb(255, 0, 0)']];
			var colorscale = [[0.0, 'rgb(0, 150, 205)'],
							[0.5-0.0875, 'rgb(0, 0, 255)'],
							[0.5+0.0875, 'rgb(0, 0, 255)'],
							[1, 'rgb(0, 150, 205)']];




			var data = [{
				z: raw_data,
				type: 'surface',
				colorscale: colorscale,
				cauto: false
			}];

			var layout = {
				title: 'OH WAIT YOU DONT HAVE TO IMAGINE',
				autosize: false,
				cauto:false,
				height: 2,
				margin: {
					l: 0,
					r: 0,
					b: 0,
					t: 0,
				},
				scene: {
					camera: {
						center: {x: 0, y: 0 , z: 0},
						eye: {x: 0.55, y: -2, z: 0.25}
					},
					zaxis: {
						range: [-1,1]
					}
				},

			};
			if (self.setupStep()==="21"){
				if (self.bedLevelResults().length == 1){
					Plotly.newPlot('bedPreviewDiv', data, layout);
				} else {
					// Plotly.deleteTraces('bedPreviewDiv', 0);
					Plotly.purge('bedPreviewDiv');
					Plotly.plot('bedPreviewDiv', data, layout);
				}
			} else {
				if (self.bedLevelResults().length == 1){
					Plotly.newPlot('maintenanceBedPreviewDiv', data, layout);
				} else {
					// Plotly.deleteTraces('bedPreviewDiv', 0);
					Plotly.purge('maintenanceBedPreviewDiv');
					Plotly.plot('maintenanceBedPreviewDiv', data, layout);
				}
			}
		};


																			 
	//   ,ad8888ba,                                                             
	//  d8"'    `"8b                                                            
	// d8'                                                                      
	// 88              ,adPPYba,   88,dPYba,,adPYba,   88,dPYba,,adPYba,        
	// 88             a8"     "8a  88P'   "88"    "8a  88P'   "88"    "8a       
	// Y8,            8b       d8  88      88      88  88      88      88       
	//  Y8a.    .a8P  "8a,   ,a8"  88      88      88  88      88      88  888  
	//   `"Y8888Y"'    `"YbbdP"'   88      88      88  88      88      88  888  
																			 
																			 
		self.storeActivation = function(actkey) {
			//console.log(actkey);
			var url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "storeActivation", {"activation":actkey})
				.done(function(response) {
					//console.log(response);
				});
		};

		self.checkActivation = function(actkey) {
			//console.log(actkey);
			var url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "checkActivation", {"userActivation":actkey})
				.done(function(response) {
					//console.log(response);
				});
		};

		self.turnSshOn = function() {
			var url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "turnSshOn")
				.done(function(response) {
					//console.log(response);
			});
		};

		self.turnSshOff = function() {
			var url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "turnSshOff")
				.done(function(response) {
					//console.log(response);
			});
		};

		self.writeNetconnectdPassword = function(password) {
			var url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "writeNetconnectdPassword", {"password":password})
				.done(function(response) {
					//console.log(response);
			});
		};

		self.changeHostname = function(hostname) {
			var url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "changeHostname", {"hostname":hostname})
				.done(function(response) {
					//console.log(response);
			});
		};

		self.adminAction = function(targetAction, payloadName, payload) {
			if (targetAction === "uploadFirmware"){
				OctoPrint.connection.disconnect();
			}
			if (targetAction === "resetRegistration"){
				self.registered(false);
				self.activated(false);
			}
			if (payloadName === undefined || payload === undefined){
				payloadName = "";
				payload = {};
			}
			// if (targetAction === "printerUpgrade"){
			// 	OctoPrint.connection.disconnect();
			// }


			var url = OctoPrint.getSimpleApiUrl("mgsetup");
			console.log("Pre-adminAction blocking test.");
			OctoPrint.issueCommand(url, "adminAction", {"action":targetAction, "payload":{[payloadName]:payload}});
				// .done(function(response) {
				// 	self.mgLog("adminAction response: "+response);
				// });
			console.log("Post-adminAction blocking test.");

		};

		self.upgradeTest = function(){
			self.commandResponse("Starting the upgrade process.\n");
			OctoPrint.connection.disconnect();
			self.commandResponse(self.commandResponse()+"Printer disconnected.\n");

			window.setTimeout(function() {self.adminAction("printerUpgrade", "upgradeType", "idRev0toRev1")},5000);




		};



																															   
	// 88        88  88      88888888888                                                 88                                       
	// 88        88  88      88                                                   ,d     ""                                       
	// 88        88  88      88                                                   88                                              
	// 88        88  88      88aaaaa      88       88  8b,dPPYba,    ,adPPYba,  MM88MMM  88   ,adPPYba,   8b,dPPYba,   ,adPPYba,  
	// 88        88  88      88"""""      88       88  88P'   `"8a  a8"     ""    88     88  a8"     "8a  88P'   `"8a  I8[    ""  
	// 88        88  88      88           88       88  88       88  8b            88     88  8b       d8  88       88   `"Y8ba,   
	// Y8a.    .a8P  88      88           "8a,   ,a88  88       88  "8a,   ,aa    88,    88  "8a,   ,a8"  88       88  aa    ]8I  
	//  `"Y8888Y"'   88      88            `"YbbdP'Y8  88       88   `"Ybbd8"'    "Y888  88   `"YbbdP"'   88       88  `"YbbdP"'  

		self.goTo = function (targetStep, forceNext){
			self.mgLog("forceNext: "+forceNext);
			if (self.specialNext() !== undefined){
				self.mgLog("specialNext(): "+self.specialNext());
				targetStep = self.specialNext();
				self.specialNext(undefined);
			} else {
				if (forceNext !== undefined){
					self.specialNext(forceNext);
				} //quick hack to let us go to a step, but force the step after to be something outside of normal flow
			//initially setup for filament loading - can now say from any step "go toload filament, and then go to X instead of 4"
			//probably the better choice over having special clones of the main step in a bunch of different places
			}

			self.setupStepHistory.push(self.setupStep());
			self.setupStep(targetStep);
			window.scroll(0,0);
			self.mgLog("targetStep: "+targetStep);
			if(self.setupStepHistory().length>0){
				self.hasHistory(true);
			}
			else {
				self.hasHistory(false);
			}
			if(self.setupStepFuture().length>0){
				self.setupStepFuture([]);
				self.hasFuture(false);
			}
			else {
				self.hasFuture(false);
			}
			self.resetStep(targetStep);
		};



		self.stepBack = function (){

			if(self.setupStepHistory().length>0){

				self.setupStepFuture().push(self.setupStep());
				self.setupStep(self.setupStepHistory().pop());

			}
			if(self.setupStepHistory().length>0){
				self.hasHistory(true);
			}
			else {
				self.hasHistory(false);
			}
			if(self.setupStepFuture().length>0){
				self.hasFuture(true);
			}
			else {
				self.hasFuture(false);
			}
			self.resetStep(self.setupStep());
		};

		self.stepForward = function (){

			if(self.setupStepFuture().length>0){

				self.setupStepHistory().push(self.setupStep());
				self.setupStep(self.setupStepFuture().pop());

			}
			if(self.setupStepHistory().length>0){
				self.hasHistory(true);
			}
			else {
				self.hasHistory(false);
			}
			if(self.setupStepFuture().length>0){
				self.hasFuture(true);
			}
			else {
				self.hasFuture(false);
			}
			self.resetStep(self.setupStep());
		};

		self.checkGoogle = function(testUrl){
			if (testUrl === undefined){
				testUrl = "none";
			}
			var url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "checkGoogle", {"url":testUrl})
				.done(function(response) {
				//console.log(response);
				});
		};

		self.mainStack = undefined;
		self.errorStack = undefined;
		self.warnStack = undefined;
		self.mgStack = undefined;

		self.notify = function (title,message,type,hide){

			if(title === undefined){
				title = "Generic Notification";
			}
			if(message === undefined){
				message = "Generic Message (no, I don't know why we're sending this either)";
			}
			if(type === undefined){
				type = "info";
			}
			if(hide === undefined){
				hide = false;
			}
			// if(fakeStack === undefined){
			// 	// fakeStack = self.mainStack;
			// 	faceStack = "hello";
			// }
			message = message.replace(/'/g, '\x27');
			message = message.replace(/"/g, '\x22');
			//message = "<input onclick='responsiveVoice.speak(\x27"+message+"\x27);' type='button' value='🔊 Play' />";

			new PNotify({
				title: title,
				text: message,
				type: type,
				hide: hide,
				after_open: function(notice){console.log("anotherLocationTest");console.log(notice);}
			});
			// console.log(fakeStack);
			// fakeStack.pnotify_remove();
		};
		
		self.showSettings = function(target) {
			if (target === undefined){
				self.settings.show("settings_plugin_netconnectd");
			} else {
				self.settings.show(target);
			}

		};

		self.warnSshNotify = function() {
			self.mgLog("warnSshNotify called.");
			if (!self.loginState.isUser()){
				self.mgLog("warnSshNotify called but user not logged in!  Returning.");
				return;
			}
			if(self.settings.settings.plugins.mgsetup.sshOn() && self.settings.settings.plugins.mgsetup.warnSsh() && self.loginState.isUser()){
				//self.notify("SSH Is Enabled","The SSH Service is currently Enabled"+"<button class=\"btngo\" data-bind=\"click: function() { $root.showSettings('settings_plugin_mgsetup') ; console.log('everything is broken') }\">Mark as last read</a>","error",false);
				title = "SSH Is Enabled";
				message = "The SSH Service is currently Enabled.  We strongly recommend Disabling the SSH Service for normal operation.";
				type = "error";
				hide = false;
				confirm = {
					confirm: true, 
					buttons: [{
						text: gettext("Change Settings"),
						click: function(notice) {
							self.showSettings('settings_plugin_mgsetup');
							notice.remove();
						}
					}, {
						text: gettext("Close"),
						click: function(notice) {
							notice.remove();
						}
					}
					]
				};

				new PNotify({
					title: title,
					text: message,
					type: type,
					hide: hide,
					confirm: confirm,
					after_open: function(notice){console.log("anotherLocationTest");console.log(notice);}
				});
			}
		};


		self.showSupport = function(input) {
			if ((self.registered() === false) || (self.activated() === false)){
				//self.support_widget.modal("show");
				self.support_widget.modal({keyboard: true, backdrop: "static", show: true});
			} else {
				zE.activate();
			}
			if (input === "hide"){
				self.support_widget.modal("hide");
			}
			if (input === "remind"){
				self.support_widget.modal("hide");
				var url = OctoPrint.getSimpleApiUrl("mgsetup");
				OctoPrint.issueCommand(url, "remindLater")
					.done(function(response) {
					//console.log(response);
					});

			}
		};

		self.showCommandResponse = function(input){

			self.command_response_popup.modal({keyboard: false, backdrop: "static", show: true});
			if (input === "hide"){
				self.command_response_popup.modal("hide");
			}
		};

		self.enableLockedButton = function(timeoutLength) {
			self.lockButton(false);
			//use this function with the self.lockButton observable in the viewmodel, to enable/disable
			//buttons after a period of time; use "enable: $root.lockButton()" in the data-bind of the button
			//and then "$root.enableLockedButton(2000)" in the "click: function() { ... }" section;
			//if just $root.enableLockedButton() is sent the default timeout will be 5 seconds.
			if (timeoutLength !== undefined && typeof(timeoutLength) === 'number'){
				window.setTimeout(function() {self.lockButton(true)},timeoutLength);
				return;
			}

			window.setTimeout(function() {self.lockButton(true)},5000);
		};

		self.unlockSupport.subscribe(function(newValue) {
			if(newValue) {  // Has focus
				zE(function() {
						zE.show();
				});
			} else {
			zE(function() {
				zE.hide();
			});       // No focus
			}
		});

		self.submitRegistration = function() {
			if (self.newsletter() === true){
				self.newsletterValue = "1";
			} else{
				self.newsletterValue = "0";
			}
			OctoPrint.postJson("http://registration.makergear.com/registrations.json", {"api_key":"v1-1234567890" , "registration":{"serial_number":self.serialNumber(), "first_name":self.firstName(), "last_name":self.lastName(), "date_received":self.dateReceived(), "email":self.emailAddress(), "channel":self.channel(), "other_channel":self.channelOtherInput(), "referrer":self.referrer(), "other_referrer":self.referrerOtherInput(), "segment":self.segment(), "other_segment":self.segmentOtherInput(), "newsletter":self.newsletterValue}}, {})
				.done(function(response){
					if (response.message == "registration successful - please check your email"){
						alert("Registration Successful - Please Check Your Email.");
						self.registered(true);
						self.storeActivation((response.activation_key));
					} 
				})
				.fail(function(response){
					alert("Something went wrong.  Please check all fields and try again, or contact Support@MakerGear.com .  Error: "+response.status+" "+response.statusText);
					self.mgLog("submitRegistration fail response: "+response);
				});
		};






		self.incrementZWiggleHeight = function (amount) {
			
			if (amount === undefined){
				amount = 0.01;
			}
			var previousHeight = self.ZWiggleHeight();
			
			self.ZWiggleHeight((parseFloat(previousHeight) + parseFloat(amount)).toFixed(2));        
			
		};
		
		self.decrementZWiggleHeight = function (amount) {
			
			if (amount === undefined){
				amount = 0.01;
			}
			var previousHeight = self.ZWiggleHeight();
			
			self.ZWiggleHeight((previousHeight - amount).toFixed(2));
		};





		self.resetStep = function(targetStep) {
			self.maintenancePage(0);
			targetStep = parseInt(targetStep);
			self.ZWiggleHeight(self.stockZWiggleHeight);
			self.T1ZWiggleHeight(self.stockZWiggleHeight);
			self.WiggleToRun(2);
			self.WiggleReady(true);

			self.checkParameters();


			if (targetStep === 0){
				self.mgLog("resetStep targetStep = 0");
				self.stepTwentyNineNext(undefined);
			}
			if (targetStep === 1){
				self.mgLog("resetStep targetStep = 1");
				self.stepOnePrepared(false);
			}
			if (targetStep === 2){
				self.mgLog("resetStep targetStep = 2");
				self.stepTwoPrepared(false);
				self.stepTwoStartingHeightSaved(false);
			}
			if (targetStep === 3){
				self.mgLog("resetStep targetStep = 3");
				self.stepThreeStartHeatingClicked(false);
				// self.stepTwentyNineNext(undefined);
			}
			if (targetStep === 4){
				self.mgLog("resetStep targetStep = 4");
				self.stepFourShowFineAdjustments(false);
				self.stepFourFirstWiggleClicked(false);
			}
			if (targetStep === 41){
				self.mgLog("resetStep targetStep = 41");
				self.stepFourShowFineAdjustments(false);
				self.stepElevenFirstWiggleClicked(false);
			}
			if (targetStep === 5){
				self.mgLog("resetStep targetStep = 5");
				self.stepFiveBeginCornerCheckClicked(false);
			}
			if (targetStep === 6){
				self.mgLog("resetStep targetStep = 6");
				self.stepSixPrepared(false);
				self.stepSixWigglePrinted(false);
			}
			if (targetStep === 7){
				self.mgLog("resetStep targetStep = 7");
			}
			if (targetStep === 8){
				self.mgLog("resetStep targetStep = 8");
				self.stepEightPrepared(false);
				self.extOneNeedsPhysical(false);
				self.cooldown();
			}
			if (targetStep === 9){
				self.mgLog("targetStep = 9");
				self.stepNineAtPosition(false);
				self.stepNineExtrudersSwitched(false);
				self.cooldown();
			}
			if (targetStep === 91){
				self.mgLog("targetStep = 91");
				self.stepNineAtPosition(false);
				self.stepNineExtrudersSwitched(false);
				self.cooldown();
			}
			if (targetStep === 10){
				self.mgLog("resetStep targetStep = 10");
				self.stepTenStartHeatingClicked(false);
				self.stepTenFirstWiggleClicked(false); //vestigial?
			}
			if (targetStep === 11){
				self.mgLog("resetStep targetStep = 11");
				self.stepElevenFirstWiggleClicked(false);
				self.stepElevenShowFineAdjustments(false);
			}
			if (targetStep === 111){
				self.mgLog("resetStep targetStep = 111");
				self.stepElevenFirstWiggleClicked(false);
				self.stepElevenShowFineAdjustments(false);
			}
            if (targetStep === 111){
				if(!self.hideDebug()){console.log("resetStep targetStep = 11");}
				self.stepElevenFirstWiggleClicked(false);
				self.stepElevenShowFineAdjustments(false);
			}
			if (targetStep === 12){
				self.mgLog("resetStep targetStep = 12");
				self.stepTwelveSimpleClicked(false);
			}
			if (targetStep === 13){
				self.mgLog("resetStep targetStep = 13");
			}
			if (targetStep === 14){
				self.mgLog("resetStep targetStep = 14");
				self.skipConfirm(false);
				self.calibrationStep(0);
				self.calibrationAxis("X");
				self.sawBinPrinted(false);
				self.sawPrintOffset(0);
				self.stepFourteenToHome(true);
				self.stepFifteeenToHome(true);
			}
			if (targetStep === 15){
				self.mgLog("resetStep targetStep = 15");
				self.skipConfirm(false);
				self.calibrationStep(0);
				self.calibrationAxis("Y");
				self.sawBinPrinted(false);
				self.sawPrintOffset(0);
				self.stepFourteenToHome(true);
				self.stepFifteeenToHome(true);
			}
			if (targetStep === 16){
				self.mgLog("resetStep targetStep = 16");
			}
			if (16<targetStep<22){
				self.mgLog("resetStep targetStep = 17~21; actual: " + targetStep.toString());
				self.probeCheckReset();
			}
			if (targetStep === 26){
				self.mgLog("resetStep targetStep = 26");
				self.stepTwelveSimpleClicked(false);
			}
			if (targetStep === 23 || targetStep === 24 || targetStep === 25){
				self.mgLog("resetStep targetStep:");
				self.mgLog(targetStep);
				self.stepThreeStartHeatingClicked(false);
				// self.stepTwentyNineNext(undefined);

			}
			if (targetStep === 28){
				self.mgLog("resetStep targetStep:");
				self.mgLog(targetStep);
				self.stepTwentyEightGuideFollowed(undefined);
				self.stepTwentyEightHotendReplaced(undefined);
			}

		};


		self.urlLogin = function () {
			if(window.location.hash) {
				var hash = window.location.hash.substring(1); //Puts hash in variable, and removes the # character
				//alert (hash);
				var vars = hash.split('&');
				var key = {};
				for (i=0; i<vars.length; i++) {
					var tmp = vars[i].split('=');
					key[tmp[0]] = tmp[1];
				}
				// console.log(key["user"]);
				// console.log(key["pass"]);
				if (!self.loginState.isUser()){
					if (key["user"] !== undefined && key["pass"] !== undefined){
						OctoPrint.browser.login(key["user"], key["pass"], true)
							.done(function(response){
								// console.log(response.message);
								// console.log(response.status);
								// console.log(response.statusText);
								// console.log(response);
								// console.log("logged in via URL");
								location.reload();
							})
							.fail(function(response){
								// console.log(response.message);
								// console.log(response.status);
								// console.log(response.statusText);
								// console.log(response);
								self.notify("URL Login Fail","There was an issue logging in with the credentials provided in the URL.  Check the credentials and try again, or login normally.","error");
							});
					}
				}
				// console.log(hash);
				// console.log(key);
				// if hash
				history.replaceState(history.state,"","/");
      // hash found
			} else {
      // No hash found
			}
		};


		self.formatTemperature = function(toolName, actual, target) {
			var output = toolName + " Temperature: " + _.sprintf("%.1f&deg;C / ", actual);

			if (target) {
				// var sign = (target >= actual) ? " \u21D7 " : " \u21D8 ";
				output += _.sprintf("%.1f&deg;C", target);
			} else {
				output += _.sprintf("%.1f&deg;C", 0);
			}

			return output;
		};








		
		

 // 88888888888  8b           d8  88888888888  888b      88  888888888888   ad88888ba   
 // 88           `8b         d8'  88           8888b     88       88       d8"     "8b  
 // 88            `8b       d8'   88           88 `8b    88       88       Y8,          
 // 88aaaaa        `8b     d8'    88aaaaa      88  `8b   88       88       `Y8aaaaa,    
 // 88"""""         `8b   d8'     88"""""      88   `8b  88       88         `"""""8b,  
 // 88               `8b d8'      88           88    `8b 88       88               `8b  
 // 88                `888'       88           88     `8888       88       Y8a     a8P  
 // 88888888888        `8'        88888888888  88      `888       88        "Y88888P"   

		self.onStartup = function () {
			self.mgLog("onStartup triggered.");
			self.requestData();
		};

		self.onAllBound = function() {
			console.log("onAllBound triggered.");

			console.log(self.temperatures.tools()[0].actual());



		};


		self.onStartupComplete = function() {
			self.mgLog("onStartupComplete triggered.");
			self.mgLogUrl = OctoPrint.getSimpleApiUrl("mgsetup");
			// console.log(PNotify);
			// console.log(PNotify.history);
			console.log(PNotify.prototype);
			PNotify.prototype.options.history.maxonscreen = 10;
			// PNotify.history.maxonscreen = 3;


			//console.log(self.temperatures.tools());

			self.mgLog("oldZOffset: "+self.oldZOffset);
			//self.updateCuraProfiles();
			// self.displayToolTemp(self.temperatures.tools()[0].actual);
			// self.displayToolTempTarget(self.temperatures.tools()[0].target);
			// if (self.temperatures.tools()[1] !== undefined){
			// 	self.displayTool1Temp(self.temperatures.tools()[1].actual);
			// 	self.displayTool1TempTarget(self.temperatures.tools()[1].target);
			// }
			// console.log(self.displayToolTemp());
			// console.log(self.displayTool1Temp());
			// console.log(typeof(self.temperatures.tools()[0]));

			self.mgtab = $("#mgtab");
			if (self.mgtab.css("visibility") == "hidden") {
				self.mgtab.css("visibility", "visible");
			}
			self.mgtabwarning = $("#mgtabwarning");
			if (self.mgtabwarning.css("display") == "inline") {
				self.mgtabwarning.css("display", "none");
			}
			self.mglogin = $("#mglogin");
			if (self.mglogin.css("visibility") == "hidden") {
				self.mglogin.css("visibility", "visible");
			}
			self.support_widget = $("#mgsetup_support_widget");
			self.command_response_popup = $("#command_response_popup");
			self.printSawBinDialog = $("#dialog-sawbin");
			self.preflightDialog = $("#dialog-preflight");
			self.hotendChangeDialog = $("#dialog-hotend-replacement");
			self.printWiggleDialog = $("#dialog-wiggle");
			self.stepOneDialog = $("#dialog-stepOne");
			self.bedConfigDialog = $("#dialog-bedConfigDialog");
			//self.checkGoogle();
			if (self.isOperational()){
				self.requestEeprom();

			}

			self.rrfMaintenanceReportBox = $("#rrfMaintenanceReport");



			self.mgLog("settings: "+self.settings);
			self.mgLog("userSettings: "+self.userSettings);

			//self.targetName = "MakerGear " + self.hostname();
			//self.settings.appearance_name(self.targetName);
			//OctoPrint.settings.save({appearance: {name:self.targetName}});
			//self.hideDebug(self.settings.plugins.mgsetup.hideDebug);
			self.hideDebug(self.settings.settings.plugins.mgsetup.hideDebug());
			//self.serialNumber(self.settings.settings.plugins.mgsetup.serialNumber());
			self.registered(self.settings.settings.plugins.mgsetup.registered());
			self.activated(self.settings.settings.plugins.mgsetup.activated());
			self.pluginVersion(self.settings.settings.plugins.mgsetup.pluginVersion());
			window.zEmbed||function(e,t){var n,o,d,i,s,a=[],r=document.createElement("iframe");window.zEmbed=function(){a.push(arguments)},window.zE=window.zE||window.zEmbed,r.src="javascript:false",r.title="",r.role="presentation",(r.frameElement||r).style.cssText="display: none",d=document.getElementsByTagName("script"),d=d[d.length-1],d.parentNode.insertBefore(r,d),i=r.contentWindow,s=i.document;try{o=s}catch(e){n=document.domain,r.src='javascript:var d=document.open();d.domain="'+n+'";void(0);',o=s}o.open()._l=function(){var e=this.createElement("script");n&&(this.domain=n),e.id="js-iframe-async",e.src="https://assets.zendesk.com/embeddable_framework/main.js",this.t=+new Date,this.zendeskHost="makergear.zendesk.com",this.zEQueue=a,this.body.appendChild(e)},o.write('<body onload="document._l();">'),o.close()}();
			zESettings = {
				webWidget: {
					contactForm: {
						fields: [
							{ id: 25226546, prefill: { '*': self.serialNumber() } }
						]
					}
				}
			};

			if (self.unlockSupport()){
				zE(function() {
					zE.show();
				});
			} else {
				zE(function() {
					zE.hide();
				});
			}
			self.apiKey(self.settings.api_key());
			//$( function() {
			// $( "#maintenanceTabs" ).tabs();
			//} );
			$( "#maintenanceTabs" ).tabdrop();
			// if(self.settings.settings.plugins.mgsetup.sshOn() && self.settings.settings.plugins.mgsetup.warnSsh()){
			// 	self.notify("SSH Is Enabled","The SSH Service is currently Enabled"+"<button data-bind=\"click: function() { $root.showSettings() }\">Mark as last read</button>","error",false);
			// }
			// self.parseProfile();
			// self.checkParameters();
			window.setTimeout(function() {self.urlLogin()},500);
		
		};


	// $("#bedConfigDialog").on("hide.bs.modal", function (e) {
	// 			self.probeLevelAssist("skipConfig")
	// 		});




		self.onEventClientOpened = function() {
			self.mgLog("onEventClientOpened triggered.");
			if (self.isOperational()) {
				// self.requestEeprom();
				OctoPrint.control.sendGcode("M114");
				//alert("hello client");
				// self.displayToolTemp(self.temperatures.tools()[0].actual);
				// self.displayToolTempTarget(self.temperatures.tools()[0].target);
				// if (self.temperatures.tools()[1] !== undefined){
				// 	self.displayTool1Temp(self.temperatures.tools()[1].actual);
				// 	self.displayTool1TempTarget(self.temperatures.tools()[1].target);
				// }
			}
			if (self.googleGood()===-1 || self.googleGood()===0){
				//window.setTimeout(function() {self.checkGoogle()},1000);
			}
		};

		self.onEventError = function(payload) {
			self.mgLog("onEventError payload: "+payload);



		};

		self.onAfterTabChange = function(current, previous){
			if (self.preventTabReset()){
				self.mgLog("preventTabReset set to true - skipping onAfterTabChange event code");
				return;
			}
			self.mgLog("Current tab:"+current);
			self.mgLog("Previous tab:"+previous);
			if(previous === "#tab_plugin_mgsetup_maintenance"){
				if (self.linkingToMaintenance() === true){
					self.linkingToMaintenance(false);
					self.mgLog("Breaking onAfterTabChange.");
					return;
				}
				self.resetStep(self.maintenancePage());
				self.mgLog("Reset page: "+self.maintenancePage().toString());
			}
			if(current === "#tab_plugin_mgsetup_maintenance"){
				if (self.linkingToMaintenance() === true){
					self.linkingToMaintenance(false);
					self.mgLog("Breaking onAfterTabChange.");
					return;
				}
				self.resetStep(self.maintenancePage());
				self.mgLog("Reset page: "+self.maintenancePage().toString());
			}
		};

		self.onUserLoggedIn = function (data){
			self.mgLog("onUserLoggedIn triggered.");
			if (self.googleGood()===-1 || self.googleGood()===0){
				//window.setTimeout(function() {self.checkGoogle()},1000);
			}
			// if (self.temperatures.tools()[1] !== undefined){
			// 	self.displayTool1Temp(self.temperatures.tools()[1].actual);
			// 	self.displayTool1TempTarget(self.temperatures.tools()[1].target);
			// }
			OctoPrint.settings.get();
			self.serialNumber(self.settings.settings.plugins.mgsetup.serialNumber());
			if (Array.isArray(self.serialNumber())){
				self.mgLog("Serial number is an array, grabbing the first entry for serialNumber() .");
				self.serialNumber(self.serialNumber()[0]);
			}
			// self.checkParameters();
			self.warnSshNotify();
		};

		self.onAfterBinding = function() {
			self.mgLog("onAfterBinding triggered.");
			// self.warnSshNotify();

			//self.support_widget = $("#mgsetup_support_widget");
		};

		self.onEventSettingsUpdated = function (payload) {
			self.mgLog("onEventSettingsUpdated triggered.");
			// the webcam url might have changed, make sure we replace it now if the tab is focused
			//self._enableWebcam();
			self.requestData();
			self.mgLog("Settings: "+self.settings);
			console.log(self.settings);
			console.log(payload);
			//self.hideDebug(self.settings.settings.plugins.mgsetup.hideDebug());
			OctoPrint.settings.get();
			// OctoPrintClient.settings.get();
			self.hideDebug(self.settings.settings.plugins.mgsetup.hideDebug());
			self.serialNumber(self.settings.settings.plugins.mgsetup.serialNumber());
			self.registered(self.settings.settings.plugins.mgsetup.registered());
			self.activated(self.settings.settings.plugins.mgsetup.activated());
			self.pluginVersion(self.settings.settings.plugins.mgsetup.pluginVersion());
			// if (self.temperatures.tools()[1] !== undefined){
			// 	self.displayTool1Temp(self.temperatures.tools()[1].actual);
			// 	self.displayTool1TempTarget(self.temperatures.tools()[1].target);
			// }
			self.parseProfile();

			window.setTimeout(function() {self.warnSshNotify()},5000);
			// self.warnSshNotify();
		};

		self.onEventPrintStarted = function(){
			//alert(self.loginState.username());
		};

		self.onEventPrintDone = function (payload) {

			//TODO: come back here and test out phant logging when prints are done.
			//Payload:

			//        name: the file’s name
			//        path: the file’s path within its storage location
			//        origin: the origin storage location of the file, either local or sdcard
			//        time: the time needed for the print, in seconds (float)
		};


		self.onEventConnected = function (payload){
			// self.displayToolTemp(self.temperatures.tools()[0].actual);
			// self.displayToolTempTarget(self.temperatures.tools()[0].target);
			// if (self.temperatures.tools()[1] !== undefined){
			// 	self.displayTool1Temp(self.temperatures.tools()[1].actual);
			// 	self.displayTool1TempTarget(self.temperatures.tools()[1].target);
			// }



		};


		self.onEventPositionUpdate = function (payload) {
			self.mgLog("onEventPositionUpdate triggered.");
			if (parseFloat(payload["z"])!==parseFloat(self.ZPos)){
				//alert(payload["z"]);
				self.currentZPosition = parseFloat(payload["z"]);
				self.ZPos(parseFloat(payload["z"]));
				self.ZPosFresh(true);
			}
		};

		self.onEventRegisteredMessageReceived = function(payload) {
			self.mgLog("onEventRegisteredMessageReceived triggered.");
			if (payload.key in self.feedbackControlLookup) {
				var outputs = self.feedbackControlLookup[payload.key];
				_.each(payload.outputs, function(value, key) {
					if (outputs.hasOwnProperty(key)) {
						outputs[key](value);
					}
				});
			}
		};

		self.onDataUpdaterPluginMessage = function(plugin, data) {
			self.mgLog("onDataUpdaterPluginMessage triggered.  Message:");
			self.mgLog(data);
			if (plugin != "mgsetup") {
				// console.log('Ignoring '+plugin);
				return;
			}
			if (data.duetFtpConfig !== undefined){
				self.mgLog(data.duetFtpConfig);
				self.rrfConfig(data.duetFtpConfig);
			}
			if (data.zoffsetline !== undefined){
				var re = /Z(-?\d+\.\d\d)/;
				if (re.exec(data.zoffsetline)){
					var result = re.exec(data.zoffsetline);
					//console.log(result[0]);
					//console.log(result[1]);
					self.ZOffset(parseFloat(result[1]));
					//console.log(data.zoffsetline);
					self.mgLog("Parsed value from data.zoffsetline: "+result);
				}
				self.zoffsetline(data.zoffsetline);
			}
			if (data.tooloffsetline !== undefined){

				if (self.rrf()){
					if (data.tooloffsetline.toString().indexOf("P1") !== -1){
// Recv: M563 P1 D1 H2 X3; Define tool 1
// Recv: G10 P1 U0 Y0 Z-.59 ; Set tool 1 axis offsets
// Recv: G10 P1 R0 S0 ; Set initial tool 1 active and standby temperatures to 0C
// Recv: 
// Recv: 
						var re = /([UYZ])-?\d?\.?\d+/g;
						// if (re.exec(data.tooloffsetline)){
						while (result = re.exec(data.tooloffsetline)){

							//var result = re.exec(data.tooloffsetline);
							self.mgLog("Parsed data from data.tooloffsetline: "+result);
							if (result[1]==="U"){
								self.tool1XOffset(parseFloat(result[0].substr(1)));
								self.mgLog("Tool 1 X (U) Offset: "+(result[0].substr(1)));
							} else if (result[1]==="Y"){
								self.tool1YOffset(parseFloat(result[0].substr(1)));
								self.mgLog("Tool 1 Y Offset: "+(result[0].substr(1)));
							} else if (result[1]==="Z"){
								self.tool1ZOffset(parseFloat(result[0].substr(1)));
								self.mgLog("Tool 1 Z Offset: "+(result[0].substr(1)));
							}
								//self.tool1XOffset(parseFloat(result[0]));
								//var result = re.exec(data.tooloffsetline);
								//console.log(result[0]);
								//self.tool1YOffset(parseFloat(result[1]));
								//console.log(data.zoffsetline);
								//console.log(result[1]);
							}
					
					}
				} else {
					var re = /([XYZ])-?\d+\.\d+/g;
					// if (re.exec(data.tooloffsetline)){
					while (result = re.exec(data.tooloffsetline)){
						//var result = re.exec(data.tooloffsetline);
						self.mgLog("Parsed data from data.tooloffsetline: "+result);
						if (result[1]==="X"){
							self.tool1XOffset(parseFloat(result[0].substr(1)));
							self.mgLog("Tool 1 X Offset: "+(result[0].substr(1)));
						} else if (result[1]==="Y"){
							self.tool1YOffset(parseFloat(result[0].substr(1)));
							self.mgLog("Tool 1 Y Offset: "+(result[0].substr(1)));
						} else if (result[1]==="Z"){
							self.tool1ZOffset(parseFloat(result[0].substr(1)));
							self.mgLog("Tool 1 Z Offset: "+(result[0].substr(1)));
						}
							//self.tool1XOffset(parseFloat(result[0]));
							//var result = re.exec(data.tooloffsetline);
							//console.log(result[0]);
							//self.tool1YOffset(parseFloat(result[1]));
							//console.log(data.zoffsetline);
							//console.log(result[1]);
					}
				}





				// }
				self.tooloffsetline(data.tooloffsetline);
			}
			//self.tooloffsetline(data.tooloffsetline);
			//self.hostname(data.hostname);

			// self.mgLog("onDataUpdaterPluginMessage content:");
			// self.mgLog(data);

			if (data == "activation failed"){

				alert("Activation Failed - Please check your entered key and try again.");

			}
			if (data == "activation success"){

				self.activated(true);
				alert("Activation Succeeded.");
				self.support_widget.modal("hide");

			}
			if (data.commandResponse !== undefined ){
				//console.log(data.commandResponse);
				self.commandResponse(self.commandResponse()+data.commandResponse.toString());

			
				//get div and scroll to bottom
				self.commandResponseText = $("#commandResponseText");
    			self.commandResponseText.scrollTop(self.commandResponseText[0].scrollHeight);
    			self.commandResponseText2 = $("#commandResponseText2");
    			self.commandResponseText2.scrollTop(self.commandResponseText2[0].scrollHeight);



			}
			if (data.commandError !== undefined){
				self.mgLog("commandError: "+data.commandError);

				var tempError = data.commandError.toString();
				tempErrorFalseNegativeLine = /^.*strace.*Broken pipe$/gm;

				tempError = tempError.replace(tempErrorFalseNegativeLine,""); //this is a normal error, but sounds worse than it is, so don't show it in the response

				self.commandResponse(self.commandResponse()+tempError);
				//get div and scroll to bottom
				self.commandResponseText = $("#commandResponseText");
    			self.commandResponseText.scrollTop(self.commandResponseText[0].scrollHeight);
    			self.commandResponseText2 = $("#commandResponseText2");
    			self.commandResponseText2.scrollTop(self.commandResponseText2[0].scrollHeight);


			}
			if (data.pleaseRemind !== undefined){
				self.remindPlease(true);
				if (self.remindPlease()===true){
					window.setTimeout(function() {self.showSupport()},10000);
					self.mgLog("Reminding.");
				}
			}
			if (data.internetConnection !== undefined){
				if (data.internetConnection){
					self.googleGood(1);
				} else{
					self.googleGood(0);
				}
			}
			//console.log(data.hostname);
			//self.serialNumber(data.serial);
			if (data.ip !== undefined){
				self.ipAddress(data.ip);
				if ((document.location.host) !== undefined){
					if (((document.location.host).split(":")[1]) !== undefined){
						self.ipPort(((document.location.host).split(":")[1]).toString());
					}
					if (((document.location.host).split(":")[0]) !== undefined){
						self.hostnameJS(((document.location.host).split(":")[0]).toString());
					}
				}
				self.mgLog("IP: "+self.ipAddress().toString()+" ; Port: "+self.ipPort()+" ; JS Hostname: "+self.hostnameJS());
				//self.printerViewString("IP:"+self.ipAddress().toString()+"|HOSTNAME:"+self.hostnameJS()+"|PORT:"+self.ipPort()+"|API:"+self.apiKey());
				self.mgLog("printerViewString: "+self.printerViewString());

			}
			if (data.firmwareline !== undefined){
				self.firmwareline(data.firmwareline);
			}
			if (data.errorline !== undefined){
				self.mgLog("errorline: "+data.errorline);
				//alert("Probing failed!  Check that the probe is installed and wired correctly, then try again.");
				self.probeCheckFailed();
				if (self.setupStep() === "21" || self.maintenanceOperation() !== "home"){
					self.probeCheckReset();
					self.notify("Probing Failed","The printer firmware has reported that a Z Probe attempt has failed.  Please try again or contact support for assistance.","error");
				}
			}
			if (data.zminline !== undefined){
				self.mgLog("zminline: "+data.zminline);
				self.zMinReceived(data.zminline);
			}
			if (data.probeline !== undefined){
				self.mgLog("probeline: "+data.probeline);
				self.probeReceived(data.probeline);
			}
			if (data.probeOffsetLine !== undefined && data.probeOffsetLine !== ""){
				self.mgLog("probeOffsetline: "+data.probeOffsetLine);
				self.filter = /M851 Z(.?\d+\.\d+)/;
				if ((match = self.filter.exec(data.probeOffsetLine)) !== null){
					if (match[1] !== undefined){
						self.mgLog("probeOffsetLine match: "+match);
						self.mgLog("probeOffsetLine match[1]: "+match[1]);
						self.probeOffset(parseFloat(match[1]));
					} else {
						self.mgLog("Tried to parse received probeOffsetline, but match[1] is undefined; probeOffsetline: "+data.probeOffset);
					}
				}
				self.filter = /G31 .* Z(.?\d+\.\d+)/;
				if ((match = self.filter.exec(data.probeOffsetLine)) !== null){
					if (match[1] !== undefined){
						self.mgLog("probeOffsetLine match: "+match);
						self.mgLog("probeOffsetLine match[1]: "+match[1]);
						self.probeOffset(parseFloat(match[1]));
					} else {
						self.mgLog("Tried to parse received probeOffsetline, but match[1] is undefined; probeOffsetline: "+data.probeOffset);
					}
				}


// # Recv: 
// # Recv: G31 P25 X21 Y0 Z0.501  U0 ; Set Z probe trigger value, offset and trigger height

			}
			if (data.bedLevelLine !== undefined){
				self.mgLog("bedLevelLine: "+data.bedLevelLine);
				self.processBedLevel(data.bedLevelLine);

			}
			if (data.mgerrorline !== undefined){
				self.mgLog("Received mgerrorline: "+data.mgerrorline);
				self.mgErrorHandler(data.mgerrorline);
			}
			if (data.mgwarnline !== undefined){
				self.mgLog("Received mgwarnline: "+data.mgwarnline);
				self.mgWarningHandler(data.mgwarnline);
			}
			if (data.logFile !== undefined){
				self.mgLog("Received logFile, trying to download.  Data: "+data.logFile);
				// OctoPrint.download(OctoPrint.getBaseUrl()+"plugin/mgsetup/maintenance/"+data.logFile);
				// OctoPrint.download("plugin/mgsetup/static/maintenance/"+data.logFile);
				window.location = ("plugin/mgsetup/static/maintenance/"+data.logFile);
			}
			if (data.printerValueVersion !== undefined){
				self.mgLog("Received new printerValueVersion: "+data.printerValueVersion);
				self.printerValueVersion(data.printerValueVersion);
			}
			if (data.octoprintVersion !== undefined){
				self.octoprintVersion(data.octoprintVersion);
			}
			if (data.mgsetupVersion !== undefined){
				self.mgsetupVersion(data.mgsetupVersion);
			}
			if (data.smbpatchstring !== undefined){
				self.smbpatchstring(data.smbpatchstring);
			}
			if (data.softwareUpgraded !== undefined){
				self.softwareUpgraded(data.softwareUpgraded);
				window.setTimeout(function() {OctoPrint.control.sendGcode(["M502","M500"])},10000);

			}


		};







		self.setRrfBedTemperature = function(targetTemperature, middleOffset, outerOffset){
			self.mgLog("setRrfBedTemperature called.");
			if (targetTemperature == undefined){
				targetTemperature = 110; 
			} else {
				targetTemperature = parseInt(targetTemperature);
			}
			if (targetTemperature != 0){
				if (middleOffset == undefined){middleOffset = 2;}
				if (outerOffset == undefined){outerOffset = 4;}
			} else {
				middleOffset = 0;
				outerOffset = 0;
			}
			OctoPrint.control.sendGcode(["M140 P0 S"+targetTemperature.toString(),
				"M140 P1 S"+(targetTemperature+middleOffset).toString(),
				"M140 P2 S"+(targetTemperature+outerOffset).toString(),
				"M140 P3 S"+(targetTemperature+outerOffset).toString()
				]);

		};



																																		   
	//   ,ad8888ba,                                      ad88888ba                                                                            
	//  d8"'    `"8b                                    d8"     "8b                                                                    ,d     
	// d8'                                              Y8,                                                                            88     
	// 88              ,adPPYba,  8b,dPPYba,            `Y8aaaaa,    88       88  8b,dPPYba,   8b,dPPYba,    ,adPPYba,   8b,dPPYba,  MM88MMM  
	// 88      88888  a8P_____88  88P'   `"8a             `"""""8b,  88       88  88P'    "8a  88P'    "8a  a8"     "8a  88P'   "Y8    88     
	// Y8,        88  8PP"""""""  88       88                   `8b  88       88  88       d8  88       d8  8b       d8  88            88     
	//  Y8a.    .a88  "8b,   ,aa  88       88  888      Y8a     a8P  "8a,   ,a88  88b,   ,a8"  88b,   ,a8"  "8a,   ,a8"  88            88,    
	//   `"Y88888P"    `"Ybbd8"'  88       88  888       "Y88888P"    `"YbbdP'Y8  88`YbbdP"'   88`YbbdP"'    `"YbbdP"'   88            "Y888  
	//                                                                            88           88                                             
	//                                                                            88           88                                             


		// self.mgLog = function(stringToLog, priority){

		// 	if (priority === undefined){
		// 		priority = 0;
		// 	}
		// 	if (stringToLog !== undefined){
		// 		if (priority === 0){
		// 			console.log(stringToLog);
		// 		}
		// 		if (priority === 1){
		// 			console.log(stringToLog);
		// 			//also send to Python side to log
		// 		}
		// 	}
		// };


		self.errLongMessage = ko.observable("");
		self.errLongMessageWaiting = ko.observable(false);
		self.errLongMessageLength = ko.observable(0);
		self.errLongMessagePosition = ko.observable(0);
		self.warnLongMessage = ko.observable("");
		self.warnLongMessageWaiting = ko.observable(false);
		self.warnLongMessageLength = ko.observable(0);
		self.warnLongMessagePosition = ko.observable(0);


//		self.mgErrorHandlerTimer = 

		self.mgErrorHandler = function(errorLine){
			if (errorLine === undefined){
				if (self.errLongMessage()!== "" && self.errLongMessageWaiting()){
					self.notify("Firmware Reported Error","The printer firmware has reported an error.\nThe reported message is: \n"+self.errLongMessage(),"error");
					self.errLongMessage("");
					self.errLongMessageWaiting(false);
					clearTimeout(self.mgErrorHandlerTimer);
					return;
				} else {
					// return;
				}
			}
			//if (self.mgErrorHandler !== undefined)
			var errCodeFilter = /\[(\d\d\d)\]-/;
			var errCodeCountFilter = /-\[(\d\d)\]/;
			var errCode = (errCodeFilter.exec(errorLine))[1];
			var errLineCountLine = (errCodeCountFilter.exec(errorLine))[1];
			self.errLongMessageLength(parseFloat(errLineCountLine.substr(1,1)));
			self.errLongMessagePosition(parseFloat(errLineCountLine.substr(0,1)));
			self.mgLog("mgErrorHandlerCalled.  errorLine: "+errorLine+" ; errCode: "+errCode+"; errLinePosition: "+errLineCountLine.substr(0,1)+"; errLineTotal: "+errLineCountLine.substr(1,1));
			switch(errCode){
				case "000":
					self.mgLog("Error 000 received, returning.");
					return;
				case "001":
					self.mgLog("Error 001 received, returning.");
					return;
				case "002":
					self.mgLog("Error 002 received, letting everything continue.");
			}
			if (self.errLongMessageLength() === 0){
				self.notify("Firmware Reported Error","The printer firmware has reported an error.\nThe reported message is: \n"+errorLine,"error");
			} else {
				if (self.errLongMessagePosition() === self.errLongMessageLength()){
					self.notify("Firmware Reported Error","The printer firmware has reported an error.\nThe reported message is: \n"+self.errLongMessage()+errorLine,"error");
					self.errLongMessage("");
					self.errLongMessageWaiting(false);
					clearTimeout(self.mgErrorHandlerTimer);
					return;
				} else {
					self.errLongMessageWaiting(true);
					self.errLongMessage(self.errLongMessage()+errorLine);
					clearTimeout(self.mgErrorHandlerTimer);
					self.mgErrorHandlerTimer = window.setTimeout(function() {self.mgErrorHandler()},(3000));
				}
			}
		};


		self.mgWarningHandler = function(warnLine){
			if (warnLine === undefined){
				if (self.warnLongMessage()!== "" && self.warnLongMessageWaiting()){
					self.notify("Firmware Reported Warning","The printer firmware has reported a Warning.\nThe reported message is: \n"+self.warnLongMessage());
					self.warnLongMessage("");
					self.warnLongMessageWaiting(false);
					clearTimeout(self.mgWarnHandlerTimer);
					return;
				} else {
					// return;
				}
			}
			//if (self.mgErrorHandler !== undefined)
			var warnCodeFilter = /\[(\d\d\d)\]-/;
			var warnCodeCountFilter = /-\[(\d\d)\]/;
			var warnCode = (warnCodeFilter.exec(warnLine))[1];
			var warnLineCountLine = (warnCodeCountFilter.exec(warnLine))[1];
			self.warnLongMessageLength(parseFloat(warnLineCountLine.substr(1,1)));
			self.warnLongMessagePosition(parseFloat(warnLineCountLine.substr(0,1)));
			self.mgLog("mgWarningHandlerCalled.  warnLine: "+warnLine+" ; warnCode: "+warnCode+"; warnLinePosition: "+warnLineCountLine.substr(0,1)+"; warnLineTotal: "+warnLineCountLine.substr(1,1));
			switch(warnCode){
				case "000":
					self.mgLog("Warning 000 received, returning.");
					return;
				case "001":
					self.mgLog("Warning 001 received, returning.");
					return;
				case "002":
					self.mgLog("Warning 002 received, letting everything continue.");
			}
			if (self.warnLongMessageLength() === 0){
				self.notify("Firmware Reported Warning","The printer firmware has reported a Warning.\nThe reported message is: \n"+warnLine);
			} else {
				if (self.warnLongMessagePosition() === self.warnLongMessageLength()){
					self.notify("Firmware Reported Warning","The printer firmware has reported a Warning.\nThe reported message is: \n"+self.warnLongMessage()+warnLine);
					self.warnLongMessage("");
					self.warnLongMessageWaiting(false);
					clearTimeout(self.mgWarningHandlerTimer);
					return;
				} else {
					self.warnLongMessageWaiting(true);
					self.warnLongMessage(self.warnLongMessage()+warnLine);
					clearTimeout(self.mgWarningHandlerTimer);
					self.mgWarningHandlerTimer = window.setTimeout(function() {self.mgWarningHandler()},(3000));
				}
			}
		};



		self.failedParameterChecks = ko.observable(0);
		self.failedParameterCheckLines = ko.observable("");

		self.checkParameters = function(){
			if (self.loginState.isUser()){
				if (self.isOperational() === false){
					window.setTimeout(function() {self.checkParameters()},(10000));
					self.mgLog("checkParameters called but not connected to printer!  Calling again in 10 seconds.");
					return;
				}
				if (self.failedParameterChecks() > 3){
					self.mgLog("failedParameterChecks: "+self.failedParameterChecks());
					self.mgLog("Bailing on checkParameters, alerting user.");
					self.notify("Printer Parameter Issue","It looks like one or more parameters that the Quick Check process requires are missing or invalid.  Please Restart OctoPrint and the printer and try again.  If this issue continues, please contact support with the following information: \n"+self.failedParameterCheckLines());
					self.failedParameterChecks(0);
					return;
				}
				self.failedParameterCheckLines("");
				var profileString = self.profileString();
				var zOffsetLine = self.zoffsetline();
				var probeOffset = self.probeOffset();
				var tooloffsetline = self.tooloffsetline();
				var failedThisRound = false;

				if (profileString === "" || profileString === undefined){
					self.parseProfile();
					failedThisRound = true;
					self.mgLog("checkParameters failed!  Bad profileString:"+profileString);
					self.failedParameterCheckLines(self.failedParameterCheckLines()+"\n"+"checkParameters failed!  Bad profileString:"+profileString);
				}

				if (!self.hasProbe()){
					if (zOffsetLine === "" || zOffsetLine === undefined){
						self.requestEeprom();
						failedThisRound = true;
						self.mgLog("checkParameters failed!  Bad zOffsetLine:"+zOffsetLine);
						self.failedParameterCheckLines(self.failedParameterCheckLines()+"\n"+"checkParameters failed!  Bad zOffsetLine:"+zOffsetLine);
					}
				} else {
					if (probeOffset === "" || probeOffset === undefined || probeOffset > 0 || probeOffset < -3){
						self.parseProfile();
						self.requestEeprom();
						failedThisRound = true;
						self.mgLog("checkParameters failed!  Bad probeOffset:"+probeOffset);
						self.failedParameterCheckLines(self.failedParameterCheckLines()+"\n"+"checkParameters failed!  Bad probeOffset:"+probeOffset);
					}
				}


				if (failedThisRound){
					var timeScaler = 0;
					self.failedParameterChecks(self.failedParameterChecks()+1);
					self.mgLog("failedParameterChecks: "+self.failedParameterChecks());
					if (self.failedParameterChecks()>=10){
						timeScaler = 10;
					} else {
						timeScaler = self.failedParameterChecks();
					}
					window.setTimeout(function() {self.checkParameters()},(1000+(1000*timeScaler)));
				} else {
					self.failedParameterChecks(0);
					self.mgLog("checkParameters passed!");
				}

			} else {
				self.mgLog("Not checking parameters - user not logged in!");
			}
		};




		self.requestEeprom = function() {
			//self.waitingForM(true);
			self.eepromData([]);
			// OctoPrint.control.sendGcode("M503");
			OctoPrint.issueCommand(self.mgLogUrl, "sendValues", {"clientVersion":self.printerValueVersion()})
				.done(function(response) {
					// console.log("mgLog send to server-side done; response: "+response);
					console.log(response);
				})
				.fail(function(response){
					// console.log("mgLog send to server-side failed!  Response: "+response+" Original message: "+stringToLog);
					console.log(response);
				});
			// self.checkParameters();
		//	self.fromCurrentData();
		};


		self.parseProfile = function() {
			// profile parser
			// look at profile model string
			// decide if we should show the single or dual version of the plugin
			// 	based on number of extruders
			// decide if we should show the probe or probeless version of the plugin
			// 	based on model string contents
			// handle firmware:
			// 	convert model string to configuration string:
			// 		convert to UPPER
			// 		convert all "-" to "_"
			// 		prefix it with "MAKERGEAR_MODEL_"
			// 	configuration.makergear.h:
			// 		check first line:
			// 			blank:
			// 				replace first line with ("#define " + [modified configuration string]) and a comment with date and "AUTOMATICALLY SELECTED PROFILE"
			// 			contains a configuration string:
			// 				add newline to beginning
			// 				comment out old configuration string - add comment at end with date and "automatically commented out by firmware configuration"
			// 				replace first line with ("#define " + [modified configuration string]) and a comment with date and "AUTOMATICALLY SELECTED PROFILE"

			// (self.settings.printerProfiles.currentProfileData().extruder.count() == 2){
			//if (self.settings.printerProfiles.currentProfileData().model().indexOf("probe") !== -1 ){
			// MakerGear M3 Single Extruder Rev 0		M3-SE Rev0-004
			// MakerGear M3 Single Extruder Rev 0		M3-SE Rev0-005
			// MakerGear M3 Independent Dual Rev 0		M3-ID Rev0-005
			// MakerGear M3 Single Extruder Rev 1		M3-SE Rev1-000
			// MakerGear M3 Independent Dual Rev 1		M3-ID Rev1-000
			self.profileString(self.settings.printerProfiles.currentProfileData().model().toString());
			self.mgLog("profileString:");
			self.mgLog(self.profileString());
			if (self.profileString() === ""){
				//self.mgLog("profileString seems to be blank, checking again.");
				//window.setTimeout(function() {self.parseProfile()},2000);
				return;
			}
			// if (profileString.indexOf("ID")!==-1){
			// 	self.isDual(true);
			// } else {
			// 	self.isDual(false);
			// }

			if (self.profileString().indexOf("M3-SE Rev0-005") !== -1 || self.profileString().indexOf("Rev1-000") !== -1 || self.rrf() ){
				self.hasProbe(true);
				self.mgLog("hasProbe true!");
			} else {
				self.hasProbe(false);
				self.mgLog("hasProbe false!");
			}






		};


		self.fromCurrentData = function (data) {
			self._processStateData(data.state);
		};

		self.fromHistoryData = function (data) {
			self._processStateData(data.state);
		};

		self._processStateData = function (data) {
			self.isErrorOrClosed(data.flags.closedOrError);
			self.isOperational(data.flags.operational);
			self.isPaused(data.flags.paused);
			self.isPrinting(data.flags.printing);
			self.isError(data.flags.error);
			self.isReady(data.flags.ready);
			self.isLoading(data.flags.loading);
		};

		self.rerenderControls = function () {
			var allControls = self.controlsFromServer.concat(self.additionalControls);
			//self.controls(self._processControls(allControls));
		};

		self.requestData = function () {
			OctoPrint.control.getCustomControls()
				.done(function(response) {
					self._fromResponse(response);
				});
		};

		self._fromResponse = function (response) {
			self.controlsFromServer = response.controls;
			self.rerenderControls();
		};

		self._processControls = function (controls) {
			for (var i = 0; i < controls.length; i++) {
				controls[i] = self._processControl(controls[i]);
			}
			return controls;
		};
		self.sendJogCommand = function (axis, multiplier, distance) {
			if (typeof distance === "undefined")
				distance = self.distance();
			if (self.settings.printerProfiles.currentProfileData() && self.settings.printerProfiles.currentProfileData()["axes"] && self.settings.printerProfiles.currentProfileData()["axes"][axis] && self.settings.printerProfiles.currentProfileData()["axes"][axis]["inverted"]()) {
				multiplier *= -1;
			}

			var data = {};
			data[axis] = distance * multiplier;
			self.ZPosFresh(false);
			OctoPrint.printer.jog(data);
			OctoPrint.control.sendGcode("M114");
			var pitch = (10 / distance)  + 100;
			var speed =  (195.2 *  distance) + 161;
			OctoPrint.control.sendGcode(["M300 S" + pitch + " P" + speed]);
			//self._logger.info("M114 supposed to be sent...");
		};
		
		self.sendJoggCommand = function (axis, multiplier, distance) {
			if (typeof distance === "undefined")
				distance = self.distance();
			if (self.settings.printerProfiles.currentProfileData() && self.settings.printerProfiles.currentProfileData()["axes"] && self.settings.printerProfiles.currentProfileData()["axes"][axis] && self.settings.printerProfiles.currentProfileData()["axes"][axis]["inverted"]()) {
				multiplier *= -1;
			}

			var data = {};
			data[axis] = distance * multiplier;
			//OctoPrint._logger.info("M114 supposed to be sent...");
			OctoPrint.printer.jog(data);
			OctoPrint.control.sendGcode("M114");
			
		};

		self.sendHomeCommand = function (axis) {
			self.ZPosFresh(false);
			OctoPrint.printer.home(axis);
		};

		self.sendFeedRateCommand = function () {
			OctoPrint.printer.setFeedrate(self.feedRate());
		};

		self.sendExtrudeCommand = function () {
			self._sendECommand(1);
		};

		self.sendRetractCommand = function () {
			self._sendECommand(-1);
		};

		self.sendFlowRateCommand = function () {
			OctoPrint.printer.setFlowrate(self.flowRate());
		};

		self._sendECommand = function (dir) {
			var length = self.extrusionAmount() || self.settings.printer_defaultExtrusionLength();
			OctoPrint.printer.extrude(length * dir);
		};

		self.sendSelectToolCommand = function (data) {
			if (!data || !data.key()) return;

			OctoPrint.printer.selectTool(data.key());
		};

		self.sendCustomCommand = function (command) {
			if (!command) return;
			var parameters = {};
			if (command.hasOwnProperty("input")) {
				_.each(command.input, function (input) {
					if (!input.hasOwnProperty("parameter") || !input.hasOwnProperty("value")) {
						return;
					}
					parameters[input.parameter] = input.value();
				});
			}

			if (command.hasOwnProperty("command") || command.hasOwnProperty("commands")) {
				var commands = command.commands || [command.command];
				OctoPrint.control.sendGcodeWithParameters(commands, parameters);
			} else if (command.hasOwnProperty("script")) {
				var script = command.script;
				var context = command.context || {};
				OctoPrint.control.sendGcodeScriptWithParameters(script, context, parameters);
			}
		};

		self.stripDistanceDecimal = function(distance) {
			return distance.toString().replace(".", "");
		};



		// self.parameterDump = function() {
		// 	console.log()






		// }








	}

	
	// This is how our plugin registers itself with the application, by adding some configuration
	// information to the global variable OCTOPRINT_VIEWMODELS
	OCTOPRINT_VIEWMODELS.push([
		// This is the constructor to call for instantiating the plugin
		MGSetupViewModel,

		// This is a list of dependencies to inject into the plugin, the order which you request
		// here is the order in which the dependencies will be injected into your view model upon
		// instantiation via the parameters argument
		["loginStateViewModel","settingsViewModel","temperatureViewModel","userSettingsViewModel","softwareUpdateViewModel"],

		// Finally, this is the list of selectors for all elements we want this view model to be bound to.
		// ["#tab_plugin_mgsetup", "#navbar_plugin_mgsetup","#mgsettings","#tab_plugin_mgsetup_maintenance","#tab_plugin_mgsetup_maintenance-cleanup"]
		["#tab_plugin_mgsetup", "#navbar_plugin_mgsetup","#mgsettings","#tab_plugin_mgsetup_maintenance-cleanup","#tab_plugin_mgsetup_rrf"]
		//["#tab_plugin_mgsetup"]
	]);
});

