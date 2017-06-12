$(function() {
	function MGSetupViewModel(parameters) {
		var self = this;
		console.log(parameters);
		self.loginState = parameters[0];
		self.settings = parameters[1];
		self.temperatures = parameters[2];
		self.userSettings = parameters[3];
		self.googleGood = ko.observable(-1);
		self.googleChecks = ko.observable(0);
		self.waitingForM = ko.observable(false);
		self.showFontAwesome = ko.observable(false);
		self.newNetconnectdPassword = ko.observable("");
		self.newHostname = ko.observable("");
		self.homeWiggleArray = ('"{% set xpos = parameters.wiggleX %}","{% set ypos = parameters.wiggleY %}","{% set zpos = parameters.wiggleHeight %}","{% set tohome = parameters.tohome %}","{% set wigglenumber = parameters.wigglenumber %}","{% set ypurge = 30 + (2 * wigglenumber ) %}","{% set epurge = 13 - wigglenumber %}","G90","M82","{% if tohome == true %}","G28","{% endif %}","G1 F1000 X205 Y{{ ypurge }} Z10","G1 F1000 Z{{ zpos }}","G92 E0","G1 F240 E{{ epurge }}","G1 F240 X190 E{{ epurge + 2}}","G1 F360 E{{ epurge + 1}}","G92 E0","G1 F1000 Z10","G1 F2500 X{{xpos}} Y{{ypos}} Z{{ zpos }}","G1 E0.95","G92 E0","G91","M83","G91","G1 X20 E0.5 F1000","G3 Y0.38 J0.19 E0.014","G1 X-20 E0.5","G3 Y0.385 J0.1925 E0.014","G1 X20 E0.5 F1000","G3 Y0.39 J0.185 E0.014","G1 X-20 E0.5","G3 Y0.395 J0.1975 E0.014","G1 X20 E0.5","G3 Y0.40 J0.2 E0.014","G1 X-20 E0.5","G3 Y0.405 J0.2025 E0.014","G1 X20 E0.5","G3 Y0.41 J0.205 E0.014","G1 X-20 E0.5","G3 Y0.415 J0.2075 E0.014","G1 X20 E0.5","G3 Y0.42 J0.21 E0.014","G1 X-20 E0.5","G3 Y0.425 J0.2125 E0.014","G1 X20 E0.5","G3 Y0.43 J0.215 E0.014","G1 X-20 E0.5","G3 Y0.435 J0.2175 E0.014","G1 X20 E0.5","G3 Y0.44 J0.22 E0.014","G1 X-20 E0.5","G3 Y0.445 J0.2225 E0.014","G1 X20 E0.5","G3 Y0.45 J0.225 E0.014","G1 X-20 E0.5","G3 Y0.455 J0.2275 E0.014","G1 X20 E0.5","G3 Y0.46 J0.23 E0.014","G1 X-20 E0.5","G3 Y0.465 J0.2325 E0.014","G1 Z10 E0.5","G1 F360 E-1","G90","M82","G92 E0","{% if wigglenumber <= 3 %}","G1 F2000 X170 Y200","{% endif %}","{% if wigglenumber == 4 %}","G1 F2000 X20 Y200","{% endif %}","{% if wigglenumber == 5 %}","G1 F2000 X170 Y200","{% endif %}"');
		self.isErrorOrClosed = ko.observable(undefined);
		self.isOperational = ko.observable(undefined);
		self.isPrinting = ko.observable(undefined);
		self.isPaused = ko.observable(undefined);
		self.isError = ko.observable(undefined);
		self.isReady = ko.observable(undefined);
		self.isLoading = ko.observable(undefined);
		self.tools = ko.observableArray([]);
		self.tools(self.temperatures.tools());
		self.testtest = ([1,2,3,"test"]);
		self.stepTwoPrepared = ko.observable(false); //implemented, good
		self.stepThreeBeginCornerCheckClicked = ko.observable(false); //implemented, good
		self.stepFivePrepared = ko.observable(false); //implemented, good
		self.stepFiveStartingHeightSaved = ko.observable(false); //implemented, good

		self.stepSevenPrepared = ko.observable(false); //implemented/updated
		self.stepSevenWigglePrinted = ko.observable(false); //implemented, good

		self.stepEightFirstWiggleClicked = ko.observable(false); //implemented, good
		self.stepEightShowFineAdjustments = ko.observable(false);

		self.stepElevenStartHeatingClicked = ko.observable(false); //implemented, good
		self.lockButton = ko.observable(true);
		self.commandResponse = ko.observable("");

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

		self.hideDebug = ko.observable(true);
		self.coldLevelCheckPosition = ko.observable(0);

		self.support_widget = undefined;

		self.mgtab = undefined;
		self.mgtabwarning = undefined;
		self.mglogin = undefined;
		console.log(self.loginState);
		self.testDisplayValue = ko.observable(parseFloat(self.displayBedTemp));
		self.displayBedTemp = ko.observable(undefined);
		self.displayBedTempTarget = ko.observable(undefined);
		self.displayToolTemp = ko.observable(undefined);
		self.displayToolTempTarget = ko.observable(undefined);
		self.displayBedTemp(self.temperatures.bedTemp.actual);
		self.displayBedTempTarget(self.temperatures.bedTemp.target);
		self.hostname = ko.observable();
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
		self.testDisplayValue = ko.observable(parseFloat(self.displayBedTemp)); 
		self.unlockAdvanced = ko.observable(false);
		
	//	window.zEmbed||function(e,t){var n,o,d,i,s,a=[],r=document.createElement("iframe");window.zEmbed=function(){a.push(arguments)},window.zE=window.zE||window.zEmbed,r.src="javascript:false",r.title="",r.role="presentation",(r.frameElement||r).style.cssText="display: none",d=document.getElementsByTagName("script"),d=d[d.length-1],d.parentNode.insertBefore(r,d),i=r.contentWindow,s=i.document;try{o=s}catch(e){n=document.domain,r.src='javascript:var d=document.open();d.domain="'+n+'";void(0);',o=s}o.open()._l=function(){var e=this.createElement("script");n&&(this.domain=n),e.id="js-iframe-async",e.src="https://assets.zendesk.com/embeddable_framework/main.js",this.t=+new Date,this.zendeskHost="makergear.zendesk.com",this.zEQueue=a,this.body.appendChild(e)},o.write('<body onload="document._l();">'),o.close()}();

		// self.updateCuraProfiles = function() {

		// 	//OctoPrint.slicing.SlicingManager.all_profiles(cura,true);
		// 	OctoPrint.slicing.listProfilesForSlicer("cura")
		// 	.done(function(response) {
		// 			console.log(response);
		// 	});

		// };

		self.onStartupComplete = function() {
			//console.log(self.temperatures.tools());
			console.log(self.oldZOffset);
			//self.updateCuraProfiles();
			self.displayToolTemp(self.temperatures.tools()[0].actual);
			self.displayToolTempTarget(self.temperatures.tools()[0].target);
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
			//self.checkGoogle();
			self.requestEeprom();
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
//			OctoPrint.postJson("https://morning-mesa-66149.herokuapp.com/registrations.json", {"api_key":"v1-1234567890" , "registration":{"serial_number":self.serialNumber(), "first_name":self.firstName(), "last_name":self.lastName(), "date_received":self.dateReceived(), "email":self.emailAddress(), "channel":self.channel(), "other_channel":self.channelOtherInput(), "referrer":self.referrer(), "other_referrer":self.referrerOtherInput(), "segment":self.segment(), "other_segment":self.segmentOtherInput(), "newsletter":self.newsletterValue}}, {})
			OctoPrint.postJson("http://registration.makergear.com/registrations.json", {"api_key":"v1-1234567890" , "registration":{"serial_number":self.serialNumber(), "first_name":self.firstName(), "last_name":self.lastName(), "date_received":self.dateReceived(), "email":self.emailAddress(), "channel":self.channel(), "other_channel":self.channelOtherInput(), "referrer":self.referrer(), "other_referrer":self.referrerOtherInput(), "segment":self.segment(), "other_segment":self.segmentOtherInput(), "newsletter":self.newsletterValue}}, {})
				.done(function(response){

					if (response.message == "registration successful - please check your email"){

						alert("Registration Successful - Please Check Your Email.");
						self.registered(true);
						self.storeActivation((response.activation_key));
					} 
					//console.log(response);
	//				alert(response.activation_key);
				})
				.fail(function(response){

					alert("Something went wrong.  Please check all fields and try again, or contact Support@MakerGear.com .  Error: "+response.status+" "+response.statusText);
					console.log(response);

				});


		};
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

		self.coldLevelCheck = function(checkPosition) {
			if (checkPosition === 0){
				OctoPrint.control.sendGcode(["G28",
					"G1 F1000 X100 Y125 Z10"]);
			};
			if (checkPosition === 1){
				OctoPrint.control.sendGcode(["G1 F1000 Z5",
					"G1 F2000 X20 Y20",
					"G1 F1000 Z0"]);
			};
			if (checkPosition === 2){
				OctoPrint.control.sendGcode(["G1 F1000 Z5",
					"G1 F2000 X180 Y20",
					"G1 F1000 Z0"]);
			};
			if (checkPosition === 3){
				OctoPrint.control.sendGcode(["G1 F1000 Z5",
					"G1 F2000 X180 Y230",
					"G1 F1000 Z0"]);
			};
			if (checkPosition === 4){
				OctoPrint.control.sendGcode(["G1 F1000 Z5",
					"G1 F2000 X20 Y220",
					"G1 F1000 Z0"]);
			};

			if (checkPosition === "next"){
				if (self.coldLevelCheckPosition()===4){
					self.coldLevelCheckPosition(1);
				} else {
					self.coldLevelCheckPosition(self.coldLevelCheckPosition() + 1);

				}
				self.coldLevelCheck(self.coldLevelCheckPosition());
			};


		};


		self.ZWiggleHeight = ko.observable(0.20);
		self.stockZWiggleHeight = 0.20;
		//self.stockZWiggleHeight = "q";
		self.WiggleToRun = ko.observable(2);
		self.WiggleReady = ko.observable(true);
		
		self.ZOffset = ko.observable();
		self.currentZPosition = ko.observable(undefined);
		self.ZPos = ko.observable();
		self.ZPosFresh = ko.observable();
		self.ZPosStatus = ko.pureComputed(function() {
			
			if (self.ZPosFresh == true) {
				return "Fresh";
			}
			if (self.ZPosFresh == false) {
				alert("stale");
				return "Stale";
				
			}
			
		},this);
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
		self.extrusionAmount = ko.observable(undefined);
		self.controls = ko.observableArray([]);
		self.distances = ko.observableArray([0.1, 1, 10, 100]);
		self.distance = ko.observable(10);
		self.feedRate = ko.observable(100);
		self.flowRate = ko.observable(100);
		
		self.setupStepSelect = ko.observable(7);
		self.setupStepOne = ko.observable(true);
		self.setupStepTwo = ko.observable(false);
		self.setupStepThree = ko.observable(false);
		self.setupStep = ko.observable("1");
		//setupStep: ko.observable(1);

		self.feedbackControlLookup = {};

		self.controlsFromServer = [];
		self.additionalControls = [];

		self.setupStepHistory = [];
		self.setupStepFuture = [];
		self.hasHistory = ko.observable(false);
		self.hasFuture = ko.observable(false);

		self.webcamDisableTimeout = undefined;

		self.keycontrolActive = ko.observable(false);
		self.keycontrolHelpActive = ko.observable(false);
		self.keycontrolPossible = ko.pureComputed(function () {
			return self.isOperational() && !self.isPrinting() && self.loginState.isUser() && !$.browser.mobile;
		});
		self.showKeycontrols = ko.pureComputed(function () {
			return self.keycontrolActive() && self.keycontrolPossible();
		});

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
		

		self.onUserLoggedIn = function (data){
			if (self.googleGood()===-1 || self.googleGood()===0){
				//window.setTimeout(function() {self.checkGoogle()},1000);
			}
			OctoPrint.settings.get();
			self.serialNumber(self.settings.settings.plugins.mgsetup.serialNumber());
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
		
		self.requestEeprom = function() {
			//self.waitingForM(true);
			self.eepromData([]);
			OctoPrint.control.sendGcode("M503");
		//	self.fromCurrentData();

		};

		self.fromHistoryData = function (data) {
			self._processStateData(data.state);
		};

// 		self.sendTones = function(tones) { //Fundamentally broken, do not use.

// //UI code sample:
// // 			Can we play a tone with sendTones() ?
// // <button data-bind="click: function() { $root.sendTones([1000,100]) }">{{ _('Send Tones') }}</button>
// // <br><br>
// 			console.log(tones);
// 			self.toneArray = [];
// 			for (var i=0; i < tones.length; i++) {
// 				console.log(i);
// 				console.log(tones.length);
// 				console.log(tones[0]);
// 				//var myRe = /(\d+),/;
// 				//self.toneArray[i].note = myRe.exec(tones)[0];
// 				//self.toneArray[i].length = myRe.exec(tones)[1];
// 				self.toneArray[i+0] = tones[i+0];
// 				console.log(self.toneArray[i]);
// 				self.toneArray[i+1] = tones[i+1];
// 				console.log(self.toneArray[i]);


// 			}
// 			self.toneList = [];
// 			for (var i=0; i<self.toneArray.length; i++) {
// 				if (self.toneArray[i] == 0){
// 					self.toneList = self.toneList.push("G4 P"+(self.toneArray[i+1]).toString());
// 				} else {
// 					self.toneList = self.toneList.push("M300 S"+(self.toneArray[i]).toString()+" P"+(self.toneArray[i+1]).toString());

// 				}
// 			}
// 			OctoPrint.control.sendGcode(self.toneList);
// 		};

		self._processStateData = function (data) {
			self.isErrorOrClosed(data.flags.closedOrError);
			self.isOperational(data.flags.operational);
			self.isPaused(data.flags.paused);
			self.isPrinting(data.flags.printing);
			self.isError(data.flags.error);
			self.isReady(data.flags.ready);
			self.isLoading(data.flags.loading);
		};

		self.onEventSettingsUpdated = function (payload) {
			// the webcam url might have changed, make sure we replace it now if the tab is focused
			//self._enableWebcam();
			self.requestData();
			console.log(self.settings);
			//self.hideDebug(self.settings.settings.plugins.mgsetup.hideDebug());
			self.hideDebug(self.settings.settings.plugins.mgsetup.hideDebug());
			self.serialNumber(self.settings.settings.plugins.mgsetup.serialNumber());
			self.registered(self.settings.settings.plugins.mgsetup.registered());
			self.activated(self.settings.settings.plugins.mgsetup.activated());
		};
		
		//self.onPrinter

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
			
			if (parseFloat(payload["z"])!==parseFloat(self.ZPos)){
				//alert(payload["z"]);
				self.currentZPosition = parseFloat(payload["z"]);
				self.ZPos(parseFloat(payload["z"]));
				self.ZPosFresh(true);
			}
		};

		self.onEventRegisteredMessageReceived = function(payload) {
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
			if (plugin != "mgsetup") {
				// console.log('Ignoring '+plugin);
				return;
			}
			var re = /Z(-?\d+\.\d\d)/;
			if (re.exec(data.zoffsetline)){
				var result = re.exec(data.zoffsetline);
				//console.log(result[0]);
				//console.log(result[1]);
				self.ZOffset(parseFloat(result[1]));
				//console.log(data.zoffsetline);
				console.log(data);
			}
			self.zoffsetline(data.zoffsetline);
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
		};
		//self.onEventConnected = function() {
		//	
		//	self.requestEeprom();
		//	OctoPrint.control.sendGcode("M114");
		//	
		//}
		
		self.onEventClientOpened = function() {
			if (self.isOperational()) {
				self.requestEeprom();
				OctoPrint.control.sendGcode("M114");
				//alert("hello client");
			}
			if (self.googleGood()===-1 || self.googleGood()===0){
				//window.setTimeout(function() {self.checkGoogle()},1000);
			}
		};
		
		self.onAfterBinding = function() {

			//self.support_widget = $("#mgsetup_support_widget");

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

		self.printWiggle = function (wigglePosition, inputWiggleHeight) {

			self.wiggleHeightAdjust = 0.1;
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
				console.log("ZWiggleHeight adjusted: "+self.ZWiggleHeight());
				//console.log(typeof(self.ZWiggleHeight()));

			}

			if (wigglePosition === 0){

				//just to keep this from being empty...

			}

			if (wigglePosition === 1){
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight() + self.wiggleHeightAdjust), heatup: true, wiggleX: 90, wiggleY: 110, tohome: true, wigglenumber: parseFloat(wigglePosition)};
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
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight() + self.wiggleHeightAdjust), heatup: true, wiggleX: 20, wiggleY: 20, tohome: true, wigglenumber: parseFloat(wigglePosition)};
				var context = {};
				console.log(parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeScriptWithParameters("/plugin/hellopablo/static/gcode/homeWiggle.gcode",context,parameters);
			}
			if (wigglePosition === 3){
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight() + self.wiggleHeightAdjust), heatup: true, wiggleX: 170, wiggleY: 20, tohome: false, wigglenumber: parseFloat(wigglePosition)};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}
			if (wigglePosition === 4){
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight() + self.wiggleHeightAdjust), heatup: true, wiggleX: 170, wiggleY: 220, tohome: false, wigglenumber: parseFloat(wigglePosition)};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}                       
			if (wigglePosition === 5){
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight() + self.wiggleHeightAdjust), heatup: true, wiggleX: 20, wiggleY: 220, tohome: false, wigglenumber: parseFloat(wigglePosition)};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}                         
			if (wigglePosition === 6){
				self.setupStep('4');
			}


			if (wigglePosition === "next"){
				self.printWiggle(self.WiggleToRun());
				self.WiggleReady(false);


			}

			if (wigglePosition === "all"){
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight() + self.wiggleHeightAdjust), heatup: true, wiggleX: 20, wiggleY: 220, tohome: true, wigglenumber: parseFloat(1)};
				var context = {};
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggleAll", context, parameters);
			} 
			if (wigglePosition === 10){ //same as position 1 but without homing
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight() + self.wiggleHeightAdjust), heatup: true, wiggleX: 90, wiggleY: 110, tohome: false, wigglenumber: parseFloat(1)};
				var context = {};
				console.log(parameters.wiggleHeight);
				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters); //remove this semicolon for further .then testing
				//OctoPrint.control.sendGcodeWithParameters(self.homeWiggleArray,parameters);
			}
			if (wigglePosition === 20){ //same as position 2 but without homing
				var parameters = {wiggleHeight: parseFloat(self.ZWiggleHeight() + self.wiggleHeightAdjust), heatup: true, wiggleX: 20, wiggleY: 20, tohome: false, wigglenumber: parseFloat(2)};
				var context = {};

				OctoPrint.control.sendGcodeScriptWithParameters("newWiggle", context, parameters);
				//OctoPrint.control.sendGcodeScriptWithParameters("/plugin/hellopablo/static/gcode/homeWiggle.gcode",context,parameters);
			}
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

		self.feedFilament = function() {
			OctoPrint.printer.extrude(75);
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

		self.onStartup = function () {
			self.requestData();
		};

		self.sendWigglePreheat = function () {
				OctoPrint.control.sendGcode(["G28 Z",
					"G28 Y X",
					"G1 X20",
					"M104 S220",
					"M140 S70"
				]);

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
				OctoPrint.control.sendGcode(["G28",
				"G1 F2000 X217 Y125",
				"G1 F1400 Z0.25",
				"M84 X"
				]);//changed to X217 for Demeter
			}

			if (checkLevelStep == "1") {
				OctoPrint.control.sendGcode(["G28",
				"G1 F2000 X205 Y125",
				"G1 F1400 Z1",
				"G1 F1400 X195 Y125"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X205 Y125");
//				OctoPrint.control.sendGcode("G1 F1400 Z1");
//				OctoPrint.control.sendGcode("G1 F1400 X195 Y125");
			}
			
			if (checkLevelStep == "2") {
				OctoPrint.control.sendGcode(["G1 F1400 Z2",
				"G1 F2000 X20 Y220",
				"G1 F1400 Z0.2"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X20 Y220");
//				OctoPrint.control.sendGcode("G1 F1400 Z0.2");
			}
			
			if (checkLevelStep == "3") {
				OctoPrint.control.sendGcode(["G1 F1400 Z2",
				"G1 F2000 X20 Y20",
				"G1 F1400 Z-0.05"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X20 Y20");
//				OctoPrint.control.sendGcode("G1 F1400 Z-0.05");
			}
			OctoPrint.control.sendGcode("M114");

		};
		
		self.setupBedLevel = function (adjustLevelStep) { //this is where the magic continues, folks
			self.ZPosFresh(false);
			if (adjustLevelStep == "0") {
				OctoPrint.control.sendGcode(["M84 S0",
				"G28",
				"G1 F2000 X20 Y50",
				"G1 F1400 Z1"
				]);
				//OctoPrint.control.sendGcode("G28");
				//OctoPrint.control.sendGcode("G1 F2000 X20 Y50");
				//OctoPrint.control.sendGcode("G1 F1400 Z1");
			}
		
			if (adjustLevelStep == "1") {
				OctoPrint.control.sendGcode(["G1 F1400 Z3",
				"G1 F2000 X20 Y50",
				"G1 F1400 Z1"
				]);
				//OctoPrint.control.sendGcode("G28");
				//OctoPrint.control.sendGcode("G1 F2000 X20 Y50");
				//OctoPrint.control.sendGcode("G1 F1400 Z1");
			}
			
			if (adjustLevelStep == "2") {
				OctoPrint.control.sendGcode(["G1 F1400 Z3",
				"G1 F2000 X180 Y30",
				"G1 F1400 Z1"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X180 Y30");
//				OctoPrint.control.sendGcode("G1 F1400 Z1");
			}			

			if (adjustLevelStep == "3") {
				OctoPrint.control.sendGcode(["G1 F1400 Z3",
				"G1 F2000 X180 Y230",
				"G1 F1400 Z1"
				]);
//				OctoPrint.control.sendGcode("G1 F2000 X180 Y230");
//				OctoPrint.control.sendGcode("G1 F1400 Z1");
			}			
		
			if (adjustLevelStep == "4") {
				OctoPrint.control.sendGcode(["G1 F1400 Z3",
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
				
				OctoPrint.control.sendGcode(["G28",
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
				self.goTo("3");
			}
			
			OctoPrint.control.sendGcode("M114");
			
		};

		
		self.stripDistanceDecimal = function(distance) {
			return distance.toString().replace(".", "");
		};




		//self.displayToolTemp(self.temperatures.tools()[0].actual);
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