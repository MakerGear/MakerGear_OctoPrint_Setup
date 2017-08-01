$(function() {
	function MGSetupViewModel(parameters) {
		var self = this;
		console.log(parameters);

		// Originally from Controls tab:
		self.loginState = parameters[0];
		self.settings = parameters[1];
		self.temperatures = parameters[2];
		self.userSettings = parameters[3];
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
		self.setupStepHistory = [];
		self.setupStepFuture = [];
		self.hasHistory = ko.observable(false);
		self.hasFuture = ko.observable(false);
		self.setupStep = ko.observable("0");

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
		self.displayBedTemp = ko.observable(undefined);
		self.displayBedTempTarget = ko.observable(undefined);
		self.displayToolTemp = ko.observable(undefined);
		self.displayToolTempTarget = ko.observable(undefined);
		self.displayTool1Temp = ko.observable(undefined);
		self.displayTool1TempTarget = ko.observable(undefined);
		self.displayBedTemp(self.temperatures.bedTemp.actual);
		self.displayBedTempTarget(self.temperatures.bedTemp.target);
		self.tools = ko.observableArray([]);
		self.tools(self.temperatures.tools());

		self.isDual = ko.pureComputed(function(){
			if (self.settings.printerProfiles.currentProfileData().extruder.count() == 2){
				console.log("We're a Dual!");
				return true;
			} else {
				console.log("We're a Single!");
				return false;
			}
		},this); //stand-in for setting dual vs. single - set to true for now/testing - TODO - change this to actually check/reflect dual state

//		self.isDual = ko.observable(false);

		self.maxSteps = ko.pureComputed(function(){
			if (self.isDual()){
				return 16;
			} else{
				return 8;
			}
		},this);

		self.ipAddress = ko.observable(undefined);
		self.ipPort = ko.observable(undefined);
		self.hostnameJS = ko.observable(undefined);
		self.printerViewString = ko.observable(undefined);
		self.apiKey = ko.observable(undefined);
		self.printerViewString = ko.pureComputed(function(){
			if ((self.settings.api_enabled()) && (self.settings.api_allowCrossOrigin())){
				return ("IP:"+self.ipAddress().toString()+"|HOSTNAME:"+self.hostnameJS()+"|PORT:"+self.ipPort()+"|API:"+self.apiKey());
			} else {
				return ("API and/or CORS are Disabled - Enable both in the API settings.");
			}
		}
		,this);

		// Settings controls:
		self.newNetconnectdPassword = ko.observable("");
		self.unlockAdvanced = ko.observable(false);
		self.pluginVersion = ko.observable("");

		// Quick Check Process starting/default values:
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
			match = self.eepromM206RegEx.exec(self.zoffsetline());
				//alert('M206 loaded; Z Home Offset: '+self.eepromData()[2].value);
			if (self.originalZOffset !== "undefined"){
				self.originalZOffset = parseFloat(match[6]);
				self.ZOffset(self.originalZOffset);
			}
			console.log(self.zoffsetline().keys());
			console.log("hey");
				//alert('M206 loaded; Z Home Offset: '+self.originalZOffset.toString());
		}
		,this);
		console.log(self.zoffsetline());
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


		// Orphaned Variables?  Test...:
		self.homeWiggleArray = ('"{% set xpos = parameters.wiggleX %}","{% set ypos = parameters.wiggleY %}","{% set zpos = parameters.wiggleHeight %}","{% set tohome = parameters.tohome %}","{% set wigglenumber = parameters.wigglenumber %}","{% set ypurge = 30 + (2 * wigglenumber ) %}","{% set epurge = 13 - wigglenumber %}","G90","M82","{% if tohome == true %}","G28","{% endif %}","G1 F1000 X205 Y{{ ypurge }} Z10","G1 F1000 Z{{ zpos }}","G92 E0","G1 F240 E{{ epurge }}","G1 F240 X190 E{{ epurge + 2}}","G1 F360 E{{ epurge + 1}}","G92 E0","G1 F1000 Z10","G1 F2500 X{{xpos}} Y{{ypos}} Z{{ zpos }}","G1 E0.95","G92 E0","G91","M83","G91","G1 X20 E0.5 F1000","G3 Y0.38 J0.19 E0.014","G1 X-20 E0.5","G3 Y0.385 J0.1925 E0.014","G1 X20 E0.5 F1000","G3 Y0.39 J0.185 E0.014","G1 X-20 E0.5","G3 Y0.395 J0.1975 E0.014","G1 X20 E0.5","G3 Y0.40 J0.2 E0.014","G1 X-20 E0.5","G3 Y0.405 J0.2025 E0.014","G1 X20 E0.5","G3 Y0.41 J0.205 E0.014","G1 X-20 E0.5","G3 Y0.415 J0.2075 E0.014","G1 X20 E0.5","G3 Y0.42 J0.21 E0.014","G1 X-20 E0.5","G3 Y0.425 J0.2125 E0.014","G1 X20 E0.5","G3 Y0.43 J0.215 E0.014","G1 X-20 E0.5","G3 Y0.435 J0.2175 E0.014","G1 X20 E0.5","G3 Y0.44 J0.22 E0.014","G1 X-20 E0.5","G3 Y0.445 J0.2225 E0.014","G1 X20 E0.5","G3 Y0.45 J0.225 E0.014","G1 X-20 E0.5","G3 Y0.455 J0.2275 E0.014","G1 X20 E0.5","G3 Y0.46 J0.23 E0.014","G1 X-20 E0.5","G3 Y0.465 J0.2325 E0.014","G1 Z10 E0.5","G1 F360 E-1","G90","M82","G92 E0","{% if wigglenumber <= 3 %}","G1 F2000 X170 Y200","{% endif %}","{% if wigglenumber == 4 %}","G1 F2000 X20 Y200","{% endif %}","{% if wigglenumber == 5 %}","G1 F2000 X170 Y200","{% endif %}"');
		self.googleChecks = ko.observable(0);
		self.waitingForM = ko.observable(false);
		self.showFontAwesome = ko.observable(false);
		self.ZPosStatus = ko.pureComputed(function() {
			if (self.ZPosFresh == true) {
				return "Fresh";
			}
			if (self.ZPosFresh == false) {
				alert("stale");
				return "Stale";
			}
		},this);
		self.setupStepSelect = ko.observable(7);
		self.setupStepOne = ko.observable(true);
		self.setupStepTwo = ko.observable(false);
		self.setupStepThree = ko.observable(false);
		self.testtest = ([1,2,3,"test"]);
		self.testDisplayValue = ko.observable(parseFloat(self.displayBedTemp)); 

		console.log(self.loginState);

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

		self.printWiggle = function (wigglePosition, inputWiggleHeight) {
			self.wiggleHeightAdjust = 0.1;
			console.log(wigglePosition);
			console.log(inputWiggleHeight);
			console.log(self.wiggleHeightAdjust);
			//console.log(typeof(self.ZWiggleHeight()));
			if (wigglePosition == undefined){
				new PNotify({
					title: "what",
					text: "wigglePosition undefined - not sure how you got here, but, uh, don't do it again, please",
					type: "error",
					//hide: self.settingsViewModel.settings.plugins.M117PopUp.autoClose()
				});
			}
			if (inputWiggleHeight !== undefined){
				self.ZWiggleHeight(parseFloat((parseFloat(self.ZWiggleHeight())+parseFloat(inputWiggleHeight)).toFixed(2)).toFixed(2));
				//self.T1ZWiggleHeight(parseFloat((parseFloat(self.T1ZWiggleHeight())+parseFloat(inputWiggleHeight)).toFixed(2)).toFixed(2));
				console.log("ZWiggleHeight adjusted: "+self.ZWiggleHeight());
				//console.log(typeof(self.ZWiggleHeight()));
			}
			if (wigglePosition === 0){
				//just to keep this from being empty...
			}
			if (wigglePosition === 1){
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2), heatup: true, wiggleX: 90, wiggleY: 110, tohome: true, wigglenumber: parseFloat(wigglePosition), tool: 0};
				var context = {};
				console.log(parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters); //remove this semicolon for further .then testing
//				OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
				//OctoPrint.control.sendGcodeScriptWithParameters("/plugin/hellopablo/static/gcode/homeWiggle.gcode",context,parameters);
		//                .then( function() {
		//                    alert("Gcode script done!");
		//
		//              });
			}
			if (wigglePosition === 2){
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2), heatup: true, wiggleX: 20, wiggleY: 20, tohome: true, wigglenumber: parseFloat(wigglePosition), tool: 0};
				var context = {};
				console.log(parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeScriptWithParameters("/plugin/hellopablo/static/gcode/homeWiggle.gcode",context,parameters);
			}
			if (wigglePosition === 3){
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2), heatup: true, wiggleX: 170, wiggleY: 20, tohome: false, wigglenumber: parseFloat(wigglePosition), tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}
			if (wigglePosition === 4){
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2), heatup: true, wiggleX: 170, wiggleY: 220, tohome: false, wigglenumber: parseFloat(wigglePosition), tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}                       
			if (wigglePosition === 5){
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2), heatup: true, wiggleX: 20, wiggleY: 220, tohome: false, wigglenumber: parseFloat(wigglePosition), tool: 0};
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
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2), heatup: true, wiggleX: 20, wiggleY: 220, tohome: true, wigglenumber: parseFloat(1), tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggleAll", context, parameters);
			} 
			if (wigglePosition === 10){ //same as position 1 but without homing
				console.log(wigglePosition);
				console.log(inputWiggleHeight);
				console.log(self.wiggleHeightAdjust);
				console.log(self.ZWiggleHeight());
				console.log(typeof(self.ZWiggleHeight()));
				console.log(typeof(self.wiggleHeightAdjust));
				console.log(parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust));
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2), heatup: true, wiggleX: 90, wiggleY: 110, tohome: false, wigglenumber: parseFloat(1), tool: 0};
				var context = {};
				console.log(parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters); //remove this semicolon for further .then testing
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}
			if (wigglePosition === 20){ //same as position 2 but without homing
				var parameters = {wiggleHeight: parseFloat(parseFloat(self.ZWiggleHeight()) + self.wiggleHeightAdjust).toFixed(2), heatup: true, wiggleX: 20, wiggleY: 20, tohome: false, wigglenumber: parseFloat(2), tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeScriptWithParameters("/plugin/hellopablo/static/gcode/homeWiggle.gcode",context,parameters);
			}
			if (wigglePosition === "dual"){
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()), heatup: true, wiggleX: 90, wiggleY: 110, tohome: true, wigglenumber: parseFloat(1), tool: 0};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()), heatup: true, wiggleX: 90, wiggleY: 110, tohome: false, wigglenumber: parseFloat(1), tool: 1};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);

			}
			if (wigglePosition === "T1"){
				var context = {};
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()), heatup: true, wiggleX: 90, wiggleY: 110, tohome: true, wigglenumber: parseFloat(1), tool: 1};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
			}
			if (wigglePosition === "T1-2"){
				var context = {};
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight()), heatup: true, wiggleX: 90, wiggleY: 110, tohome: false, wigglenumber: parseFloat(1), tool: 1};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
			}

		};

		self.feedFilament = function(targetTool) {

			if (targetTool == undefined){
				targetTool = "tool0";
			}
			if (targetTool == "tool0"){
				OctoPrint.control.sendGcode(["T0"]);
			} else if (targetTool == "tool1"){
				OctoPrint.control.sendGcode(["T1"]);
			}
			OctoPrint.printer.extrude(75, {"tool":targetTool});
		};

		self.sendWigglePreheat = function (targetHotend, targetTemperature) {

			if (targetTemperature == undefined){
				temperature = 220;
			}
			if (targetHotend == undefined){
				hotend = "T0";
			} else {
				hotend = targetHotend;
			}
			if (hotend == "T0"){
				OctoPrint.control.sendGcode(["G28 Z",
					"G28 Y X",
					"G1 X20",
					"M104 T0 S220",
					"M140 S70"
				]);
			} else if (hotend == "T1"){
				OctoPrint.control.sendGcode(["G28 Z",
					"G28 Y X",
					"G1 X20 Y100",
					"M104 T1 S220",
					"M140 S70",
					"T1"
				]);
			}
		};

		self.cooldown = function () {
			OctoPrint.control.sendGcode(["M104 T0 S0",
				"M104 T1 S0",
				"M140 S0"
			]);
		};

		self.setupCheckLevel = function (checkLevelStep) { //this is where the magic starts, folks
			self.ZPosFresh(false);
			if (checkLevelStep == "0") {
				OctoPrint.control.sendGcode(["T0",
				"M605 S1",
				"G28",
				"G1 F2000 X217 Y125",
				"G1 F1400 Z0.25",
				"G4 P1000",
				"M84 X"
				]);//changed to X217 for Demeter
			}
			if (checkLevelStep == "1") {
				OctoPrint.control.sendGcode(["T0",
				"G28",
				"G1 F2000 X205 Y125",
				"G1 F1400 Z1",
				"G1 F1400 X195 Y125"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X205 Y125");
//				OctoPrint.control.sendGcode("G1 F1400 Z1");
//				OctoPrint.control.sendGcode("G1 F1400 X195 Y125");
			}
			if (checkLevelStep == "2") {
				OctoPrint.control.sendGcode(["T0",
				"G1 F1400 Z2",
				"G1 F2000 X20 Y220",
				"G1 F1400 Z0.2"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X20 Y220");
//				OctoPrint.control.sendGcode("G1 F1400 Z0.2");
			}
			if (checkLevelStep == "3") {
				OctoPrint.control.sendGcode(["T0",
				"G1 F1400 Z2",
				"G1 F2000 X20 Y20",
				"G1 F1400 Z-0.05"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X20 Y20");
//				OctoPrint.control.sendGcode("G1 F1400 Z-0.05");
			}
			if (checkLevelStep == "4") { //for Dual
				OctoPrint.control.sendGcode(["G28",
					"T0",
					"G1 F2000 X217 Y125",
					"G1 F1400 Z0.25",
					"G4 P1000",
					"M84 X",
					"T1",
					"G4 P1000",
					"M84 X"]);
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
			if (startingHeightStep == "0") {
				OctoPrint.control.sendGcode(["T0",
				"G28",
				"G1 F1400 X100 Y125 Z50",
				"G1 F1400 Z5",
				"M114"
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
					console.log(self.newZOffset);
					console.log(self.ZOffset());
					console.log(self.ZPos());
					//alert(self.newZOffset + " " + self.ZPos() + " " + self.ZOffset());
					self.ZOffString = "M206 Z"+self.newZOffset.toString();
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
				}
			}
			if (startingHeightStep == "2") {
				self.newZOffset = (parseFloat(self.ZOffset())-parseFloat(parseFloat(self.ZWiggleHeight())-self.stockZWiggleHeight));
				if (self.newZOffset.toString() == "NaN") {
					self.notify("Offset Setting Error","There was an error when setting the Z Offset.  Please refresh the page and try again.  Support values: self.newZOffset="+self.newZOffset.toString()+" ; self.ZOffset="+self.ZOffset().toString()+" ; self.ZWiggleHeight="+self.ZWiggleHeight().toString()+" ; self.stockZWiggleHeight="+self.stockZWiggleHeight.toString(), "error");
					console.log("Offset setting error:");
					console.log("self.newZOffset = "+self.newZOffset.toString());
					console.log("self.ZOffset = "+self.ZOffset().toString());
					console.log("self.ZWiggleHeight = "+self.ZWiggleHeight().toString());
					return;
				}
				//self.newZOffset = self.newZOffset + 0.1 ;
				self.ZOffString = "M206 Z"+self.newZOffset.toString();
				console.log(self.newZOffset.toString());
				console.log(self.ZOffString);
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

			if (startingHeightStep == "T1") {
				self.newZOffset = (parseFloat(self.tool1ZOffset())-parseFloat(parseFloat(self.ZWiggleHeight())-self.stockZWiggleHeight));
				if (self.newZOffset.toString() == "NaN") {
					self.notify("Offset Setting Error","There was an error when setting the Z Offset.  Please refresh the page and try again.  Support values: self.newZOffset="+self.newZOffset.toString()+" ; self.ZOffset="+self.ZOffset().toString()+" ; self.ZWiggleHeight="+self.ZWiggleHeight().toString()+" ; self.stockZWiggleHeight="+self.stockZWiggleHeight.toString(), "error");
					console.log("Offset setting error:");
					console.log("self.newZOffset = "+self.newZOffset.toString());
					console.log("self.tool1ZOffset = "+self.tool1ZOffset().toString());
					console.log("self.ZWiggleHeight = "+self.ZWiggleHeight().toString());
					return;
				}
				//self.newZOffset = self.newZOffset + 0.1 ;
				self.ZOffString = "M218 T1 Z"+self.newZOffset.toString();
				console.log(self.newZOffset.toString());
				console.log(self.ZOffString);
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
				self.goTo("14");
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
					"G1 F2000 X20 Y20",
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
					"G1 F2000 X20 Y220",
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

		self.dualSetupCheckLevel = function(dualCheckLevelStep){

			if (dualCheckLevelStep === 0){
				OctoPrint.control.sendGcode(["M218 T1 Z0",
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
				]);
			}
		};



		self.dualRightNozzleAdjust = function(dualRightNozzleAdjustStep){

			if (dualRightNozzleAdjustStep === 0){
				OctoPrint.control.sendGcode(["M218 T1 Z0",
					"M500",
					"G28 X",
					"T0",
					"G28 X",
					"T0",
					"G28",
				]);
				OctoPrint.printer.extrude(10);
				self.cooldown();
			}

			if (dualRightNozzleAdjustStep === 1){
				OctoPrint.control.sendGcode(["T1",
					"G92 E0",
					"G1 F200 E-0.5",
					"G92 E0",
					"T0",
					"G28 X",
					"G28",
					"G1 F2000 X100 Y125 Z10",
					"G1 F1400 Z2"
				]);
			}
			if (dualRightNozzleAdjustStep === 2){
				OctoPrint.control.sendGcode(["T1"
				]);
			}
			if (dualRightNozzleAdjustStep === 3){
				// OctoPrint.control.sendGcode(["T0"
				// ]);
				self.goTo("10");
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
		self.sawBinPrinted = ko.observable(false);

		self.printSawBinConfirm = function(){
			if (self.skipConfirm() == false){
				self.printSawBinDialog.modal("show");
			} else {
				self.printSawBin();
			}
		};

		self.printSawBin = function(){

			console.log("Print Saw Bin triggered. Calibration Step: "+self.calibrationStep().toString()+" . Calibration Axis: "+self.calibrationAxis().toString()+" .");
			if (self.calibrationAxis()=="X"){
				if (self.calibrationStep() === 0){
					var parameters = {};
					var context = {};
					OctoPrint.control.sendGcodeScriptWithParameters("bin025", context, parameters);
				}
				if (self.calibrationStep() === 1){
					var parameters = {};
					var context = {};
					OctoPrint.control.sendGcodeScriptWithParameters("saw01", context, parameters);
				}
				if (self.calibrationStep() === 2){
					var parameters = {};
					var context = {};
					OctoPrint.control.sendGcodeScriptWithParameters("saw005", context, parameters);
				}
			}
			if (self.calibrationAxis()=="Y"){
				if (self.calibrationStep() === 0){
					var parameters = {};
					var context = {};
					OctoPrint.control.sendGcodeScriptWithParameters("Ybin025", context, parameters);
				}
				if (self.calibrationStep() === 1){
					var parameters = {};
					var context = {};
					OctoPrint.control.sendGcodeScriptWithParameters("Ysaw01", context, parameters);
				}
				if (self.calibrationStep() === 2){
					var parameters = {};
					var context = {};
					OctoPrint.control.sendGcodeScriptWithParameters("Ysaw005", context, parameters);
				}
			}
			self.sawBinPrinted(true);

		};

		self.pickSawBin = function(chosenMatch){
			if (self.calibrationAxis()=="X"){
				if (chosenMatch == 1){
					console.log("PickSawBin 1, X.");
					self.newT1XOffset = ((self.tool1XOffset()+(2*self.calibrationOffset())).toString());
					OctoPrint.control.sendGcode(["M218 T1 X"+self.newT1XOffset,
						"M500",
						"M501"]);
				}
				if (chosenMatch == 2){
					console.log("PickSawBin 2, X.");
					self.newT1XOffset = ((self.tool1XOffset()+(1*self.calibrationOffset())).toString());
					OctoPrint.control.sendGcode(["M218 T1 X"+self.newT1XOffset,
						"M500",
						"M501"]);
				}
				if (chosenMatch == 3){
					console.log("PickSawBin 3, X.");
					// self.newT1XOffset = ((self.tool1XOffset()+(0*self.calibrationOffset())).toString());
					// OctoPrint.control.sendGcode(["M218 T1 X"+self.newT1XOffset,
					// 	"M500",
					// 	"M501"]);
					self.calibrationStep(self.calibrationStep()+1);
					if (self.calibrationStep() === 3){
						self.calibrationAxis("Y");
						self.calibrationStep(0);
						self.goTo("15");
					}
				}
				if (chosenMatch == 4){
					console.log("PickSawBin 4, X.");
					self.newT1XOffset = ((self.tool1XOffset()+(-1*self.calibrationOffset())).toString());
					OctoPrint.control.sendGcode(["M218 T1 X"+self.newT1XOffset,
						"M500",
						"M501"]);
				}
				if (chosenMatch == 5){
					console.log("PickSawBin 5, X.");
					self.newT1XOffset = ((self.tool1XOffset()+(-2*self.calibrationOffset())).toString());
					OctoPrint.control.sendGcode(["M218 T1 X"+self.newT1XOffset,
						"M500",
						"M501"]);
				}
			} else if (self.calibrationAxis()=="Y"){
				if (chosenMatch == 1){
					console.log("PickSawBin 1, Y.");
					self.newT1YOffset = ((self.tool1YOffset()+(2*self.calibrationOffset())).toString());
					OctoPrint.control.sendGcode(["M218 T1 Y"+self.newT1YOffset,
						"M500",
						"M501"]);
				}
				if (chosenMatch == 2){
					console.log("PickSawBin 2, Y.");
					self.newT1YOffset = ((self.tool1YOffset()+(1*self.calibrationOffset())).toString());
					OctoPrint.control.sendGcode(["M218 T1 Y"+self.newT1YOffset,
						"M500",
						"M501"]);
				}
				if (chosenMatch == 3){
					console.log("PickSawBin 3, Y.");
					// self.newT1YOffset = ((self.tool1YOffset()+(0*self.calibrationOffset())).toString());
					// OctoPrint.control.sendGcode(["M218 T1 Y"+self.newT1YOffset,
					// 	"M500",
					// 	"M501"]);
					self.calibrationStep(self.calibrationStep()+1);
					if (self.calibrationStep() === 3){
						self.calibrationStep(0);
						self.goTo("16");
					}
				}
				if (chosenMatch == 4){
					console.log("PickSawBin 4, Y.");
					self.newT1YOffset = ((self.tool1YOffset()+(-1*self.calibrationOffset())).toString());
					OctoPrint.control.sendGcode(["M218 T1 Y"+self.newT1YOffset,
						"M500",
						"M501"]);
				}
				if (chosenMatch == 5){
					console.log("PickSawBin 5, Y.");
					self.newT1YOffset = ((self.tool1YOffset()+(-2*self.calibrationOffset())).toString());
					OctoPrint.control.sendGcode(["M218 T1 Y"+self.newT1YOffset,
						"M500",
						"M501"]);
				}
			}
			self.sawBinPrinted(false);
		};


// print bins:

// "were any of the top spikes inside of the bin?"

// if yes, user selects the best bin and center from there to print sawteeth
// if no, user selects closest bin, we center on bin and then print bins again

// to center - if bin 1, add (2*offset); if bin 2, add (1*offset); bin 3, (0*offset); bin 4, (-1*offset); bin 5, (-2*offset) to M218 T1 X offset















																			 
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
			url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "storeActivation", {"activation":actkey})
				.done(function(response) {
					//console.log(response);
				});
		};

		self.checkActivation = function(actkey) {
			//console.log(actkey);
			url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "checkActivation", {"userActivation":actkey})
				.done(function(response) {
					//console.log(response);
				});
		};

		self.turnSshOn = function() {
			url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "turnSshOn")
				.done(function(response) {
					//console.log(response);
			});
		};

		self.turnSshOff = function() {
			url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "turnSshOff")
				.done(function(response) {
					//console.log(response);
			});
		};

		self.writeNetconnectdPassword = function(password) {
			url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "writeNetconnectdPassword", {"password":password})
				.done(function(response) {
					//console.log(response);
			});
		};

		self.changeHostname = function(hostname) {
			url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "changeHostname", {"hostname":hostname})
				.done(function(response) {
					//console.log(response);
			});
		};

		self.adminAction = function(targetAction) {
			if (targetAction === "uploadFirmware"){
				OctoPrint.connection.disconnect();
			}
			if (targetAction === "resetRegistration"){
				self.registered(false);
				self.activated(false);
			}
			url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "adminAction", {"action":targetAction})
				.done(function(response) {
					console.log(response);
				});
		};

																															   
	// 88        88  88      88888888888                                                 88                                       
	// 88        88  88      88                                                   ,d     ""                                       
	// 88        88  88      88                                                   88                                              
	// 88        88  88      88aaaaa      88       88  8b,dPPYba,    ,adPPYba,  MM88MMM  88   ,adPPYba,   8b,dPPYba,   ,adPPYba,  
	// 88        88  88      88"""""      88       88  88P'   `"8a  a8"     ""    88     88  a8"     "8a  88P'   `"8a  I8[    ""  
	// 88        88  88      88           88       88  88       88  8b            88     88  8b       d8  88       88   `"Y8ba,   
	// Y8a.    .a8P  88      88           "8a,   ,a88  88       88  "8a,   ,aa    88,    88  "8a,   ,a8"  88       88  aa    ]8I  
	//  `"Y8888Y"'   88      88            `"YbbdP'Y8  88       88   `"Ybbd8"'    "Y888  88   `"YbbdP"'   88       88  `"YbbdP"'  

		self.goTo = function (targetStep){

			self.setupStepHistory.push(self.setupStep());
			self.setupStep(targetStep);
			if(self.setupStepHistory.length>0){
				self.hasHistory(true);
			}
			else {
				self.hasHistory(false);
			}
			if(self.setupStepFuture.length>0){
				self.hasFuture(true);
			}
			else {
				self.hasFuture(false);
			}
			self.resetStep(targetStep);
		};

		self.stepBack = function (){

			if(self.setupStepHistory.length>0){

				self.setupStepFuture.push(self.setupStep());
				self.setupStep(self.setupStepHistory.pop());

			}
			if(self.setupStepHistory.length>0){
				self.hasHistory(true);
			}
			else {
				self.hasHistory(false);
			}
			if(self.setupStepFuture.length>0){
				self.hasFuture(true);
			}
			else {
				self.hasFuture(false);
			}
			self.resetStep(self.setupStep());
		};

		self.stepForward = function (){

			if(self.setupStepFuture.length>0){

				self.setupStepHistory.push(self.setupStep());
				self.setupStep(self.setupStepFuture.pop());

			}
			if(self.setupStepHistory.length>0){
				self.hasHistory(true);
			}
			else {
				self.hasHistory(false);
			}
			if(self.setupStepFuture.length>0){
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
			url = OctoPrint.getSimpleApiUrl("mgsetup");
			OctoPrint.issueCommand(url, "checkGoogle", {"url":testUrl})
				.done(function(response) {
				//console.log(response);
				});

			// if (self.loginState.isUser()){
			// 	OctoPrint.util.testUrl("http://www.google.com", {"response": "true"})
			// 		.done(function(response) {
			// 			if (response.result) {
			// 				console.log(response);
   //      	            // check passed
   //          	       // alert("connected to google!")
			// 				self.googleChecks(self.googleChecks()+1);
			// 				if (response.status!==0 && response.status < 300){
			// 					self.googleGood(1);
			// 				}
			// 			} else {
			// 			//check failed
			// 				if (self.googleChecks()>4){
			// 				self.googleGood(0);
			// 				} else {
			// 					window.setTimeout(function() {self.checkGoogle()},3000);
			// 					console.log("Google Check: "+str(self.googleChecks()));

			// 				}
			// 			}
			// 		});
			// } else {
			// 	//window.setTimeout(function() {self.checkGoogle()},5000);
			// }
		};

		self.notify = function (title,message,type,hide){

			if(title == undefined){
				title = "Generic Notification";
			}
			if(message == undefined){
				message = "Generic Message (no, I don't know why we're sending this either)";
			}
			if(type == undefined){
				type = "info";
			}
			if(hide == undefined){
				hide = false;
			}
			message = message.replace(/'/g, '\x27');
			message = message.replace(/"/g, '\x22');
			//message = "<input onclick='responsiveVoice.speak(\x27"+message+"\x27);' type='button' value='🔊 Play' />";
			new PNotify({
				title: title,
				text: message,
				type: type,
				hide: hide,
			});
		};
		
		self.showSettings = function(target) {
			if (target == undefined){
				self.settings.show("settings_plugin_netconnectd");
			} else {
				self.settings.show(target);
			}

		};

		self.showSupport = function(input) {
			if ((self.registered() === false) || (self.activated() === false)){
				//self.support_widget.modal("show");
				self.support_widget.modal({keyboard: false, backdrop: "static", show: true});
			} else {
				zE.activate();
			}
			if (input === "hide"){
				self.support_widget.modal("hide");
			}
			if (input === "remind"){
				self.support_widget.modal("hide");
				url = OctoPrint.getSimpleApiUrl("mgsetup");
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
			if (timeoutLength != undefined && typeof(timeoutLength) === 'number'){
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
			if (self.newsletter() == true){
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
					console.log(response);
				});
		};






		self.incrementZWiggleHeight = function (amount) {
			
			if (amount == undefined){
				amount = 0.01;
			}
			previousHeight = self.ZWiggleHeight();
			
			self.ZWiggleHeight((parseFloat(previousHeight) + parseFloat(amount)).toFixed(2));        
			
		};
		
		self.decrementZWiggleHeight = function (amount) {
			
			if (amount == undefined){
				amount = 0.01;
			}
			previousHeight = self.ZWiggleHeight();
			
			self.ZWiggleHeight((previousHeight - amount).toFixed(2));
		};





		self.resetStep = function(targetStep) {
			targetStep = parseInt(targetStep);
			self.ZWiggleHeight(self.stockZWiggleHeight);
			self.T1ZWiggleHeight(self.stockZWiggleHeight);
			self.WiggleToRun(2);
			self.WiggleReady(true);


			if (targetStep === 0){
				console.log("resetStep targetStep = 0");
			}
			if (targetStep === 1){
				console.log("resetStep targetStep = 1");
				self.stepOnePrepared(false);
			}
			if (targetStep === 2){
				console.log("resetStep targetStep = 2");
				self.stepTwoPrepared(false);
				self.stepTwoStartingHeightSaved(false);
			}
			if (targetStep === 3){
				console.log("resetStep targetStep = 3");
				self.stepThreeStartHeatingClicked(false);
			}
			if (targetStep === 4){
				console.log("resetStep targetStep = 4");
				self.stepFourShowFineAdjustments(false);
				self.stepFourFirstWiggleClicked(false);
			}
			if (targetStep === 5){
				console.log("resetStep targetStep = 5");
				self.stepFiveBeginCornerCheckClicked(false);
			}
			if (targetStep === 6){
				console.log("resetStep targetStep = 6");
				self.stepSixPrepared(false);
				self.stepSixWigglePrinted(false);
			}
			if (targetStep === 7){
				console.log("resetStep targetStep = 7");
			}
			if (targetStep === 8){
				console.log("resetStep targetStep = 8");
				self.stepEightPrepared(false);
				self.extOneNeedsPhysical(false);
			}
			if (targetStep === 9){
				console.log("targetStep = 9");
				self.stepNineAtPosition(false);
				self.stepNineExtrudersSwitched(false);
			}
			if (targetStep === 10){
				console.log("resetStep targetStep = 10");
				self.stepTenStartHeatingClicked(false);
				self.stepTenFirstWiggleClicked(false); //vestigial?
			}
			if (targetStep === 11){
				console.log("resetStep targetStep = 11");
				self.stepElevenFirstWiggleClicked(false);
				self.stepElevenShowFineAdjustments(false);
			}
			if (targetStep === 12){
				console.log("resetStep targetStep = 12");
			}
			if (targetStep === 12){
				console.log("resetStep targetStep = 13");
			}
			if (targetStep === 14){
				console.log("resetStep targetStep = 14");
				self.skipConfirm(false);
				self.calibrationStep(0);
				self.calibrationAxis("X");
				self.sawBinPrinted(false);
			}
			if (targetStep === 15){
				console.log("resetStep targetStep = 15");
				self.skipConfirm(false);
				self.calibrationStep(0);
				self.calibrationAxis("Y");
				self.sawBinPrinted(false);
			}
			if (targetStep === 16){
				console.log("resetStep targetStep = 16");
			}

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
			console.log("onStartup triggered.");
			self.requestData();
		};

		self.onStartupComplete = function() {
			console.log("onStartupComplete triggered.");
			//console.log(self.temperatures.tools());
			console.log(self.oldZOffset);
			//self.updateCuraProfiles();
			self.displayToolTemp(self.temperatures.tools()[0].actual);
			self.displayToolTempTarget(self.temperatures.tools()[0].target);
			if (self.temperatures.tools()[1] != undefined){
				self.displayTool1Temp(self.temperatures.tools()[1].actual);
				self.displayTool1TempTarget(self.temperatures.tools()[1].target);
			}
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
			self.printSawBinDialog = $("#dialog");
			//self.checkGoogle();
			if (self.isOperational()){
				self.requestEeprom();
			}
			console.log(self.settings);
			console.log(self.userSettings);
			self.targetName = "MakerGear " + self.hostname();
			self.settings.appearance_name(self.targetName);
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

			//console.log(parseFloat(self.displayBedTemp));
			//console.log(parseFloat(self.displayToolTemp));

			/*self.tempsDangerous = function() {

				if (parseFloat(self.displayBedTemp()) > 40 || parseFloat(self.displayToolTemp()) > 50){
					return 'red';
				} else {
					return 'green';
				}

			};*/
			//OctoPrint.settings.save({settings: {allViewModels: {ControlViewModel: {} }}})
			// console.log(self.settings.printerProfiles.currentProfileData().extruder.count());
			// if (self.settings.printerProfiles.currentProfileData().extruder.count() == 2){
			// 	self.isDual(true);
			// 	console.log("We're a Dual!");
			// }

			// console.log(document.location.host);
		};

		self.onEventClientOpened = function() {
			console.log("onEventClientOpened triggered.");
			if (self.isOperational()) {
				self.requestEeprom();
				OctoPrint.control.sendGcode("M114");
				//alert("hello client");
			}
			if (self.googleGood()===-1 || self.googleGood()===0){
				//window.setTimeout(function() {self.checkGoogle()},1000);
			}
		};

		self.onUserLoggedIn = function (data){
			console.log("onUserLoggedIn triggered.");
			if (self.googleGood()===-1 || self.googleGood()===0){
				//window.setTimeout(function() {self.checkGoogle()},1000);
			}
			OctoPrint.settings.get();
			self.serialNumber(self.settings.settings.plugins.mgsetup.serialNumber());
			if (Array.isArray(self.serialNumber())){
				console.log("Serial number is an array, grabbing the first entry for serialNumber() .");
				self.serialNumber(self.serialNumber()[0]);
			}
		};

		self.onAfterBinding = function() {
			console.log("onAfterBinding triggered.");
			//self.support_widget = $("#mgsetup_support_widget");
		};

		self.onEventSettingsUpdated = function (payload) {
			console.log("onEventSettingsUpdated triggered.");
			// the webcam url might have changed, make sure we replace it now if the tab is focused
			//self._enableWebcam();
			self.requestData();
			console.log(self.settings);
			//self.hideDebug(self.settings.settings.plugins.mgsetup.hideDebug());
			self.hideDebug(self.settings.settings.plugins.mgsetup.hideDebug());
			self.serialNumber(self.settings.settings.plugins.mgsetup.serialNumber());
			self.registered(self.settings.settings.plugins.mgsetup.registered());
			self.activated(self.settings.settings.plugins.mgsetup.activated());
			self.pluginVersion(self.settings.settings.plugins.mgsetup.pluginVersion());
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

		self.onEventPositionUpdate = function (payload) {
			console.log("onEventPositionUpdate triggered.");
			if (parseFloat(payload["z"])!==parseFloat(self.ZPos)){
				//alert(payload["z"]);
				self.currentZPosition = parseFloat(payload["z"]);
				self.ZPos(parseFloat(payload["z"]));
				self.ZPosFresh(true);
			}
		};

		self.onEventRegisteredMessageReceived = function(payload) {
			console.log("onEventRegisteredMessageReceived triggered.");
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
			console.log("onDataUpdaterPluginMessage triggered.");
			if (plugin != "mgsetup") {
				// console.log('Ignoring '+plugin);
				return;
			}
			if (data.zoffsetline != undefined){
				var re = /Z(-?\d+\.\d\d)/;
				if (re.exec(data.zoffsetline)){
					var result = re.exec(data.zoffsetline);
					//console.log(result[0]);
					//console.log(result[1]);
					self.ZOffset(parseFloat(result[1]));
					//console.log(data.zoffsetline);
					console.log(result);
				}
				self.zoffsetline(data.zoffsetline);
			}
			if (data.tooloffsetline != undefined){
				var re = /([XYZ])-?\d+\.\d+/g;
				while (result = re.exec(data.tooloffsetline)){
					//var result = re.exec(data.tooloffsetline);
					console.log(result);
					if (result[1]==="X"){
						self.tool1XOffset(parseFloat(result[0].substr(1)));
						console.log("Tool 1 X Offset: "+(result[0].substr(1)));
					} else if (result[1]==="Y"){
						self.tool1YOffset(parseFloat(result[0].substr(1)));
						console.log("Tool 1 Y Offset: "+(result[0].substr(1)));
					} else if (result[1]==="Z"){
						self.tool1ZOffset(parseFloat(result[0].substr(1)));
						console.log("Tool 1 Z Offset: "+(result[0].substr(1)));
					}
					//self.tool1XOffset(parseFloat(result[0]));
					//var result = re.exec(data.tooloffsetline);
					//console.log(result[0]);
					//self.tool1YOffset(parseFloat(result[1]));
					//console.log(data.zoffsetline);
					//console.log(result[1]);

				}
				self.tooloffsetline(data.tooloffsetline);
			}
			//self.tooloffsetline(data.tooloffsetline);
			self.hostname(data.hostname);
			console.log("onDataUpdaterPluginMessage content:");
			console.log(data);
			if (data == "activation failed"){

				alert("Activation Failed - Please check your entered key and try again.");

			}
			if (data == "activation success"){

				self.activated(true);
				alert("Activation Succeeded.");
				self.support_widget.modal("hide");

			}
			if (data.commandResponse != undefined ){
				//console.log(data.commandResponse);
				self.commandResponse(self.commandResponse()+data.commandResponse);
			}
			if (data.commandError != undefined){
				console.log(data.commandError);
			}
			if (data.pleaseRemind != undefined){
				self.remindPlease(true);
				if (self.remindPlease()===true){
					window.setTimeout(function() {self.showSupport()},10000);
					console.log("Reminding.");
				}
			}
			if (data.internetConnection != undefined){
				if (data.internetConnection){
					self.googleGood(1);
				} else{
					self.googleGood(0);
				}
			}
			//console.log(data.hostname);
			//self.serialNumber(data.serial);
			if (data.ip != undefined){
				self.ipAddress(data.ip);
				self.ipPort(((document.location.host).split(":")[1]).toString());
				self.hostnameJS(((document.location.host).split(":")[0]).toString());
				console.log("IP: "+self.ipAddress().toString()+" ; Port: "+self.ipPort()+" ; JS Hostname: "+self.hostnameJS());
				//self.printerViewString("IP:"+self.ipAddress().toString()+"|HOSTNAME:"+self.hostnameJS()+"|PORT:"+self.ipPort()+"|API:"+self.apiKey());
				console.log(self.printerViewString());

			}
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
		self.requestEeprom = function() {
			//self.waitingForM(true);
			self.eepromData([]);
			OctoPrint.control.sendGcode("M503");
		//	self.fromCurrentData();

		};

		self.fromCurrentData = function (data) {
			self._processStateData(data.state);

			//if (self.waitingForM()===true){
				/*_.each(data.logs, function (line) {
					// M206 Home offset
					if (self.eepromData().length>4){
						self.eepromData([]);
						self.requestEeprom();
						return;
					}*/
					/*match = self.eepromM206RegEx.exec(line);
						if (match) {
							self.eepromData.push({
								dataType: 'M206 X',
								position: 21,
								origValue: match[2],
								value: match[2],
								description: 'X Home offset (mm)'
							});
							self.eepromData.push({
								dataType: 'M206 Y',
								position: 22,
								origValue: match[4],
								value: match[4],
								description: 'Y Home offset (mm)'
							});
							self.eepromData.push({
								dataType: 'M206 Z',
								position: 23,
								origValue: match[6],
								value: match[6],
								description: 'Z Home offset (mm)'
							});
							if (self.eepromData()[2].dataType ==="M206 Z"){
								console.log(self.eepromData());	
								//alert('M206 loaded; Z Home Offset: '+self.eepromData()[2].value);
								if (self.originalZOffset !== "undefined"){
									self.originalZOffset = parseFloat(self.eepromData()[2].value);
									self.ZOffset(self.originalZOffset);
								}
								//alert('M206 loaded; Z Home Offset: '+self.originalZOffset.toString());
							}
							
						}*/
				//});
				//self.waitingForM(false);
			//}
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










	}

	
	// This is how our plugin registers itself with the application, by adding some configuration
	// information to the global variable OCTOPRINT_VIEWMODELS
	OCTOPRINT_VIEWMODELS.push([
		// This is the constructor to call for instantiating the plugin
		MGSetupViewModel,

		// This is a list of dependencies to inject into the plugin, the order which you request
		// here is the order in which the dependencies will be injected into your view model upon
		// instantiation via the parameters argument
		["loginStateViewModel","settingsViewModel","temperatureViewModel","userSettingsViewModel"],

		// Finally, this is the list of selectors for all elements we want this view model to be bound to.
		["#tab_plugin_mgsetup", "#navbar_plugin_mgsetup","#mgsettings"]
		//["#tab_plugin_mgsetup"]
	]);
});

