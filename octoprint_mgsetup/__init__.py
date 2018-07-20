# coding=utf-8

from __future__ import absolute_import, division, print_function
import re


import subprocess
import os
import shutil
import hashlib
import logging
import socket
import yaml
import octoprint.plugin
import octoprint.settings
from octoprint.events import Events
import flask
import traceback
import time
import datetime
import errno
import sys
import urllib2
from logging.handlers import TimedRotatingFileHandler
from logging.handlers import RotatingFileHandler
from zipfile import *
from octoprint import __version__





current_position = "empty for now"
position_state = "stale"
# zoffsetline = ""




class MGSetupPlugin(octoprint.plugin.StartupPlugin,
						octoprint.plugin.TemplatePlugin,
						octoprint.plugin.SettingsPlugin,
						octoprint.plugin.AssetPlugin,
						octoprint.plugin.SimpleApiPlugin,
						octoprint.plugin.EventHandlerPlugin):
	def __init__(self):
		self.oldZOffset = 0
		self.firstTab = True
		self.firstRunComplete = False
		self.hideDebug = False
		self.firstTabName = "plugin_mgsetup"
		self.newhost =  socket.gethostname()
		self.serial = -1
		self.registered = False
		self.activated = False
		self.actApiKey = 0
		self.actServer = "http://whatever.what"
		self.nextReminder = -1
		self.internetConnection = False
		self.tooloffsetline = ""
		self.zoffsetline = ""
		self.pluginVersion = ""
		self.ip = ""
		self.firmwareline = ""
		self.localfirmwareline = ""
		self.probeline = ""
		self.probeOffsetLine = ""
		self.printActive = False
		self.mgLogger = logging.getLogger("mgLumberJack")
		self.mgLogger.setLevel(logging.DEBUG)
		self.mgLoggerFirstRun = logging.getLogger("mgFirstRun")
		self.mgLoggerFirstRun.setLevel(5)
		self.mgLoggerPermanent = logging.getLogger("mgPermanent")
		self.mgLoggerPermanent.setLevel(5)
		self.mgLogger.info("right after init test!?")
		self.printerValueVersion = 0
		self.printerValueGood = False
		self.currentProjectName = ""
		self.currentProjectPrintSuccessTime = 0
		self.currentProjectPrintFailTime = 0
		self.currentProjectMachineFailTime = 0
		self.totalPrintSuccessTime = 0
		self.totalPrintFailTime = 0
		self.totalMachineFailTime = 0
		self.printing = False
		self.currentPrintStartTime = 0
		self.currentPrintElapsedTime = 0
		self.printElapsedTimer = octoprint.util.RepeatedTimer(12, self.updateElapsedTime)
		self.updateElapsedTimer = False
		self.smbpatchstring = ""




	def create_loggers(self):
		formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
		handler = logging.handlers.TimedRotatingFileHandler(self._basefolder+"/logs/mgsetup.log", when="d", interval=3, backupCount=10)
		firstRunHandler = logging.handlers.RotatingFileHandler(self._basefolder+"/logs/mgsetupFirstRun.log", maxBytes=100000000, backupCount=20)
		# firstRunHandler.setLevel(5)
		permanentHandler = logging.handlers.RotatingFileHandler(self._basefolder+"/logs/mgsetupPermanent.log", maxBytes=100000000, backupCount=20)
		# permanentHandler.setLevel(5)
		handler.setFormatter(formatter)
		firstRunHandler.setFormatter(formatter)
		permanentHandler.setFormatter(formatter)
		self.mgLogger.addHandler(handler)
		# self.mgLogger.addHandler(firstRunHandler)
		# self.mgLogger.addHandler(permanentHandler)
		self.mgLoggerPermanent.addHandler(permanentHandler)
		self.mgLoggerFirstRun.addHandler(firstRunHandler)


		# self.mgLogger.info("on_after_startup mgLogger test!")
		self.mgLog("general test",0)
		# self.mgLog("permanent test",2)
		# self.mgLog("firstrun test",3)
		# self.mgLog("permanent and first run test",4)




	def mgLog(self,message,level=2):
		self._logger.info(message)
		self.mgLogger.info(message)
		if (level == 2):
			self.mgLoggerPermanent.info(message)
			self.mgLogger.info("Also logged to PERMANENT")
		if (level == 3):
			self.mgLoggerFirstRun.info(message)
			self.mgLogger.info("Also logged to FIRST RUN")
		if (level == 4):
			self.mgLoggerPermanent.info(message)
			self.mgLoggerFirstRun.info(message)
			self.mgLogger.info("Also logged to PERMANENT and FIRST RUN")

			# Defined as an API target as well, so we can target it from octoprint client - [wherever]/octoprint client post_json '/api/plugin/mgsetup' '{"command":"mgLog","stringToLog":"[whateverYouWantToLog]","priority":"[priorityLevel]"}
			




	def on_settings_initialized(self):
		self.mgLogger.info("First mgLogger test!?")
		self._logger.info("MGSetup on_settings_initialized triggered.")
		# octoprint.settings.Settings.add_overlay(octoprint.settings.settings(), dict(controls=dict(children=dict(name="Medium Quality"), dict(commands=["M201 X900 Y900", "M205 X20 Y20", "M220 S50"]))))
		#octoprint.settings.Settings.set(octoprint.settings.settings(), ["controls", "children", "name"],["Fan Orn"])
		#octoprint.settings.Settings.add_overlay(octoprint.settings.settings(), ["controls"],["name"]
		#dict(api=dict(enabled=False),
		 #                                  server=dict(host="127.0.0.1",
		  #                                             port=5001))

		octoprint.settings.Settings.get(octoprint.settings.settings(),["appearance", "components", "order", "tab"])
		self.firstTab = self._settings.get(["firstTab"])
		if self.firstTab:
			self.firstTabName = "plugin_mgsetup"
			# octoprint.settings.Settings.set(octoprint.settings.settings(),["appearance", "components", "order", "tab"],["plugin_mgsetup", "temperature", "control", "gcodeviewer", "terminal", "timelapse"],force=True)
			octoprint.settings.Settings.add_overlay(octoprint.settings.settings(),dict(appearance=dict(components=dict(order=dict(tab=["plugin_mgsetup", "temperature", "control", "gcodeviewer", "terminal", "timelapse"])))))
		else:
			self.firstTabName = "temperature"
			# octoprint.settings.Settings.set(octoprint.settings.settings(),["appearance", "components", "order", "tab"],["temperature", "control", "gcodeviewer", "terminal", "plugin_mgsetup", "timelapse"],force=True)
			octoprint.settings.Settings.add_overlay(octoprint.settings.settings(),dict(appearance=dict(components=dict(order=dict(tab=["temperature", "control", "gcodeviewer", "terminal", "plugin_mgsetup", "timelapse"])))))
		self.firstRunComplete = self._settings.get(["firstRunComplete"])
		self.hideDebug = self._settings.get(["hideDebug"])
		if self._settings.get(["serialNumber"]) != -1:
			self.serial = self._settings.get(["serialNumber"])
			self._logger.info("Retrieved serialNumber from Settings.")
		else:
			if os.path.isfile('/boot/serial.txt'):
				with open('/boot/serial.txt', 'r') as f:
					self.serial = f.readline().strip()
					self._settings.set(["serialNumber"],self.serial)
					self._settings.save()
			else:
				self._logger.info("serial.txt does not exist!")
		self._logger.info(self.serial)
		self.registered = self._settings.get(["registered"])
		self.activated = self._settings.get(["activated"])
		self.nextReminder = self._settings.get(["nextReminder"])
		self.pluginVersion = self._settings.get(["pluginVersion"])
		self.currentProjectPrintSuccessTime = self._settings.get(["currentProjectPrintSuccessTime"])
		self.currentProjectName = self._settings.get(["currentProjectName"])
		self.totalPrintSuccessTime = self._settings.get(["totalPrintSuccessTime"])
		self.currentProjectPrintFailTime = self._settings.get(["currentProjectPrintFailTime"])
		self.currentProjectMachineFailTime = self._settings.get(["currentProjectMachineFailTime"])
		self.totalPrintFailTime = self._settings.get(["totalPrintFailTime"])
		self.totalMachineFailTime = self._settings.get(["totalMachineFailTime"])


		#		octoprint.settings.Settings.set(dict(appearance=dict(components=dict(order=dict(tab=[MGSetupPlugin().firstTabName, "temperature", "control", "gcodeviewer", "terminal", "timelapse"])))))
		#		octoprint.settings.Settings.set(dict(appearance=dict(name=["MakerGear "+self.newhost])))
		#__plugin_settings_overlay__ = dict(appearance=dict(components=dict(order=dict(tab=[MGSetupPlugin().firstTabName]))))
		octoprint.settings.Settings.set(octoprint.settings.settings(),["appearance", "name"],["MakerGear " +self.newhost])
		self.activeProfile = (octoprint.settings.Settings.get( octoprint.settings.settings() , ["printerProfiles","default"] ))
		self._logger.info(self.activeProfile)
		self._logger.info("extruders: "+str( ( self._printer_profile_manager.get_all() [ self.activeProfile ]["extruder"]["count"] ) ) )
		self._logger.info(self._printer_profile_manager.get_current_or_default()["extruder"]["count"])
		self._logger.info("Hello")


	def checkInternet(self, timeout, iterations, url):
		self._logger.info("MGSetup checkInternet triggered.")
		if url == 'none':
			url = "http://google.com"
		elif url == 'fail':
			url = "http://httpstat.us/404"
		else:
			url = url
		for i in range(0, iterations+1):
			self._logger.info("Testing Internet Connection, iteration "+str(i)+" of "+str(iterations)+", timeout of "+str(timeout)+" .")
			try:
				response=urllib2.urlopen(url,timeout=timeout)
				self._logger.info("Check Internet Passed.  URL: "+str(url))
				self.internetConnection = True
				self._plugin_manager.send_plugin_message("mgsetup", dict(internetConnection = self.internetConnection))
				return True
			except urllib2.URLError as err: pass
			if (i >= iterations):
				self._logger.info("Testing Internet Connection Failed, iteration "+str(i)+" of "+str(iterations)+", timeout of "+str(timeout)+" .  Looking for URL: "+str(url))
				self.internetConnection = False
				self._plugin_manager.send_plugin_message("mgsetup", dict(internetConnection = self.internetConnection))
				return False



	def on_after_startup(self):
		self.create_loggers()
		self._logger.info("MGSetup on_after_startup triggered.")
		# self._logger.info("extruders: "+str(self._printer_profile_manager.get_current()))
		# self._logger.info("extruders: "+str(self._settings.get(["printerProfiles","currentProfileData","extruder.count"])))
		self.current_position = current_position
		self._logger.info(self.newhost)
		self.checkInternet(3,3,'none')
		# self._logger.info(self._printer_profile_manager.get_all())
		# self._logger.info(self._printer_profile_manager.get_current())
		self._logger.info(self._printer_profile_manager.get_all()["_default"]["extruder"]["count"])
		# self._logger.info(__version__)


		subprocess.call("/home/pi/.octoprint/scripts/hosts.sh") #recreate hostsname.js for external devices/ print finder
		
		try:  #a bunch of code with minor error checking and user alert...ion to copy scripts to the right location; should only ever need to be run once
			os.makedirs('/home/pi/.octoprint/scripts/gcode')
		except OSError:
			if not os.path.isdir('/home/pi/.octoprint/scripts/gcode'):
				raise

		src_files = os.listdir(self._basefolder+"/static/maintenance/gcode")
		src = (self._basefolder+"/static/maintenance/gcode")
		dest = ("/home/pi/.octoprint/scripts/gcode")
		for file_name in src_files:
			full_src_name = os.path.join(src, file_name)
			full_dest_name = os.path.join(dest, file_name)
			if not (os.path.isfile(full_dest_name)):
				shutil.copy(full_src_name, dest)
				self._logger.info("Had to copy "+file_name+" to scripts folder.")
			else:
				if ((hashlib.md5(open(full_src_name).read()).hexdigest()) != (hashlib.md5(open(full_dest_name).read()).hexdigest())):
					shutil.copy(full_src_name, dest)
					self._logger.info("Had to overwrite "+file_name+" with new version.")

		src_files = os.listdir(self._basefolder+"/static/maintenance/scripts/")
		src = (self._basefolder+"/static/maintenance/scripts/")
		dest = ("/home/pi/.octoprint/scripts/")
		for file_name in src_files:
			full_src_name = os.path.join(src, file_name)
			full_dest_name = os.path.join(dest, file_name)
			if not (os.path.isfile(full_dest_name)):
				shutil.copy(full_src_name, dest)
				self._logger.info("Had to copy "+file_name+" to scripts folder.")
			else:
				if ((hashlib.md5(open(full_src_name).read()).hexdigest()) != (hashlib.md5(open(full_dest_name).read()).hexdigest())):
					shutil.copy(full_src_name, dest)
					self._logger.info("Had to overwrite "+file_name+" with new version.")
			if ".sh" in file_name:
				os.chmod(full_dest_name, 0755)

		src_files = os.listdir(self._basefolder+"/static/maintenance/cura/")
		src = (self._basefolder+"/static/maintenance/cura/")
		dest = ("/home/pi/.octoprint/slicingProfiles/cura/")
		for file_name in src_files:
			full_src_name = os.path.join(src, file_name)
			full_dest_name = os.path.join(dest, file_name)
			if not (os.path.isfile(full_dest_name)):
				shutil.copy(full_src_name, dest)
				self._logger.info("Had to copy "+file_name+" to scripts folder.")
			else:
				if ((hashlib.md5(open(full_src_name).read()).hexdigest()) != (hashlib.md5(open(full_dest_name).read()).hexdigest())):
					shutil.copy(full_src_name, dest)
					self._logger.info("Had to overwrite "+file_name+" with new version.")
		try:
			os.chmod("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/js/hostname.js", 0666)
		except OSError:
			self._logger.info("Hostname.js doesn't exist?")
		except:
			raise
		try:
			os.chmod("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/patch.sh", 0755)
		except OSError:
			self._logger.info("Patch.sh doesn't exist?")
		except:
			raise
		try:
			os.chmod("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/logpatch.sh", 0755)
		except OSError:
			self._logger.info("logpatch.sh doesn't exist?")
		except:
			raise


		try:
			self.ip = str(([l for l in ([ip for ip in socket.gethostbyname_ex(socket.gethostname())[2] if not ip.startswith("127.")][:1], [[(s.connect(('8.8.8.8', 53)), s.getsockname()[0], s.close()) for s in [socket.socket(socket.AF_INET, socket.SOCK_DGRAM)]][0][1]]) if l][0][0]))
		except IOError, e:
			self._logger.info(e)
		except:
			raise
		self.getLocalFirmwareVersion()
		self.adminAction(dict(action="sshState"))
		if (self._settings.get(["printing"])):
			self.mgLog("It looks like the machine crashed while printing - updating machineFail times and reseting.",2)
			self.currentProjectMachineFailTime = self.currentProjectMachineFailTime + (self.currentPrintElapsedTime - self.currentPrintStartTime)
			self.totalMachineFailTime = self.totalMachineFailTime + (self.currentPrintElapsedTime - self.currentPrintStartTime)
			self.printing = False
			self.currentPrintStartTime = 0
			self.currentPrintElapsedTime = 0
			self._settings.set(["currentProjectMachineFailTime"], self.currentProjectMachineFailTime)
			self._settings.set(["totalMachineFailTime"], self.totalMachineFailTime)
			self._settings.set(["printing"],self.printing)
			self._settings.set(["currentPrintStartTime"],self.currentPrintStartTime)
			self._settings.set(["currentPrintElapsedTime"],self.currentPrintElapsedTime)
			self._settings.save()
			self.printElapsedTimer.start()

		#if
		smbHashVal = (hashlib.md5(open("/etc/samba/smb.conf").read()).hexdigest()) # != "03dc1620b398cbe3d2d82e83c20c1905":
		if smbHashVal == "44c057b0ffc7ab0f88c1923bdd32b559":
			self.smbpatchstring = "Patch Already In Place"
			self.mgLog("smb.conf hash matches patched file, no need to patch",2)
		elif smbHashVal == "95b44915e267400669b2724e0cce5967":
			self.smbpatchstring = "Patch was required: smb.conf has been patched"
			self.mgLog("smb.conf hash matches unpatched file, now patching file",2)
			self.patchSmb()

		else :
			self.smbpatchstring = "Custom smb.conf file present: patch status unknown"
			self.mgLog("Custom smb.conf file present: patch status unknown. No Action",2)



	def get_template_configs(self):
		self._logger.info("MGSetup get_template_configs triggered.")
		return [
			dict(type="navbar", custom_bindings=True),
			dict(type="settings", custom_bindings=True),
			dict(type="tab", template="mgsetup_tab.jinja2", div="tab_plugin_mgsetup"),
			# dict(type="tab", template="mgsetup_maintenance_tab.jinja2", div="tab_plugin_mgsetup_maintenance", name="MakerGear Maintenance"),
			dict(type="tab", template="mgsetup_maintenance_tab-cleanup.jinja2", div="tab_plugin_mgsetup_maintenance-cleanup", name="MakerGear Maintenance")
		]

	def get_settings_defaults(self):
		self._logger.info("MGSetup get_settings_defaults triggered.")
		return dict(hideDebug=True,
			firstRunComplete=False,
			registered=False,
			activated=False,
			firstTab=True,
			serialNumber = -1,
			nextReminder = -1,
			pluginVersion = "master",
			localFirmwareVersion = "",
			sshOn = False,
			warnSsh = True,
			currentProjectName = "",
			currentProjectPrintSuccessTime = 0,
			currentProjectPrintFailTime = 0,
			currentProjectMachineFailTime = 0,
			totalPrintSuccessTime = 0,
			totalPrintFailTime = 0,
			totalMachineFailTime = 0,
			printing = False,
			currentPrintStartTime = 0,
			currentPrintElapsedTime = 0)





	def get_settings_restricted_paths(self):
		self._logger.info("MGSetup get_settings_restricted_paths triggered.")
		return dict(user=[["serialNumber","registered","activated"],])

	def get_assets(self):
		self._logger.info("MGSetup get_assets triggered.")
		return dict(
			js=["js/mgsetup.js","js/mgsetup_maintenance.js"],
			css=["css/mgsetup.css", "css/overrides.css"],
			img=["img/*"],
			gcode=["gcode/*"],
			videojs=["video-js/*"]
		)
	
	def remindLater(self):
		self._logger.info("MGSetup remindLater triggered.")
		self.nextReminder = time.mktime(time.gmtime()) + 604800
		self._logger.info("Next Reminder: "+str(self.nextReminder) + ", currently: "+str(time.mktime(time.gmtime())))
		self._settings.set(["nextReminder"],self.nextReminder)
		self._settings.save()



	def on_event(self, event, payload):
		self._logger.info("MGSetup on_event triggered.")
		if event == Events.POSITION_UPDATE:
			self._logger.info(payload)
			self.current_position = dict(payload)
			self.position_state = "fresh"
		##			self._logger.info(current_position)
			return

		if event == Events.CLIENT_OPENED:
			#self._logger.info(payload + " connected")
			#self.serial = ""
			self.sendCurrentValues()
			# self._plugin_manager.send_plugin_message("mgsetup", dict(zoffsetline = self.zoffsetline))
			# self._plugin_manager.send_plugin_message("mgsetup", dict(tooloffsetline = self.tooloffsetline))
			self._plugin_manager.send_plugin_message("mgsetup", dict(ip = self.ip))
			self._plugin_manager.send_plugin_message("mgsetup", dict(octoprintVersion = __version__))
			self._plugin_manager.send_plugin_message("mgsetup", dict(mgsetupVersion = self._plugin_version))
			self._plugin_manager.send_plugin_message("mgsetup", dict(smbpatchstring = self.smbpatchstring))


			# self._plugin_manager.send_plugin_message("mgsetup", dict(firmwareline = self.firmwareline))
			# self._plugin_manager.send_plugin_message("mgsetup", dict(probeOffsetLine = self.probeOffsetLine))
			self._logger.info(str(self.nextReminder))
			#if (self.internetConnection == False ):
			self.checkInternet(3,5, 'none')
			#else:
			#	self._plugin_manager.send_plugin_message("mgsetup", dict(internetConnection = self.internetConnection))

			if (self.activated == False) or (self.registered ==False):
				if (self.nextReminder <= time.mktime(time.gmtime())) and (self.nextReminder > 0):
					self._logger.info("nextReminder is in the past and not 0")
					self._plugin_manager.send_plugin_message("mgsetup", dict(pleaseRemind = True))
				else:
					self._logger.info("nextReminder in the future or 0")
					self._logger.info(str(self.nextReminder))
					self._logger.info(str(time.mktime(time.gmtime())))
				return

		if event == Events.PRINT_STARTED:
			self.printActive = True
			self.printing = True
			self.currentPrintStartTime = time.mktime(time.gmtime())
			self.currentPrintElapsedTime = self.currentPrintStartTime
			self._settings.set(["printing"],self.printing)
			self._settings.set(["currentPrintStartTime"],self.currentPrintStartTime)
			self._settings.set(["currentPrintElapsedTime"],self.currentPrintElapsedTime)
			self._settings.save()
			self._logger.info("Current print start time:")
			self._logger.info(self.currentPrintStartTime)
			self.updateElapsedTimer = True


		if (event == Events.PRINT_FAILED) or (event == Events.PRINT_CANCELLED) or (event == Events.PRINT_DONE) or (event == Events.CONNECTED) or (event == Events.DISCONNECTED):
			self.printActive = False

		if (event == Events.PRINT_FAILED) or (event == Events.PRINT_CANCELLED):
			self.printing = False
			currentTime = time.mktime(time.gmtime())
			if (self.currentPrintStartTime != 0) and (currentTime > self.currentPrintStartTime):
				self.currentProjectPrintFailTime = self.currentProjectPrintFailTime + (currentTime - self.currentPrintStartTime)
				self._settings.set(["currentProjectPrintFailTime"], self.currentProjectPrintFailTime)
				self.totalPrintFailTime = self.totalPrintFailTime + (currentTime - self.currentPrintStartTime)
				self._settings.set(["totalPrintFailTime"], self.totalPrintFailTime)
				self._logger.info("totalPrintFailTime:")
				self._logger.info(self.totalPrintFailTime)
			self.currentPrintStartTime = 0
			self._settings.set(["currentPrintStartTime"],self.currentPrintStartTime)
			self.updateElapsedTimer = False
			self.currentPrintElapsedTime = 0
			self._settings.set(["currentPrintElapsedTime"],self.currentPrintElapsedTime)
			self._settings.save()
			self.triggerSettingsUpdate()


			# self.currentProjectPrintSuccessTime = self.currentProjectPrintSuccessTime + 

		if (event == Events.PRINT_DONE):
			self._logger.info("PRINT_DONE triggered.")
			self.currentProjectPrintSuccessTime = self.currentProjectPrintSuccessTime + payload["time"]
			self.totalPrintSuccessTime = self.totalPrintSuccessTime + payload["time"]
			self._settings.set(["totalPrintSuccessTime"],self.totalPrintSuccessTime)
			self._settings.set(["currentProjectPrintSuccessTime"],self.currentProjectPrintSuccessTime)
			self._settings.save()
			# octoprint.settings.Settings.save()
			self.printing = False
			self.currentPrintStartTime = 0
			self.updateElapsedTimer = False
			self.currentPrintElapsedTime = 0
			self._settings.set(["printing"],self.printing)
			self._settings.set(["currentPrintStartTime"],self.currentPrintStartTime)
			self._settings.set(["currentPrintElapsedTime"],self.currentPrintElapsedTime)
			self._settings.save()
			self.triggerSettingsUpdate()





		if event == Events.DISCONNECTED:
			self.printerValueGood = False

		if event == Events.CONNECTED:
			self.requestValues()

	def triggerSettingsUpdate(self):
		payload = dict(
		config_hash=self._settings.config_hash,
		effective_hash=self._settings.effective_hash
		)
		self._event_bus.fire(Events.SETTINGS_UPDATED, payload=payload)

	def updateElapsedTime(self):
		if (self.printing and self.updateElapsedTimer):
			self.currentPrintElapsedTime = time.mktime(time.gmtime())
			self._settings.set(["currentPrintElapsedTime"],self.currentPrintElapsedTime)
			self._settings.save()
			self._logger.info("New currentPrintElapsedTime:")
			self._logger.info(self.currentPrintElapsedTime)



	def _to_unicode(self, s_or_u, encoding="utf-8", errors="strict"):
		"""Make sure ``s_or_u`` is a unicode string."""
		if isinstance(s_or_u, str):
			return s_or_u.decode(encoding, errors=errors)
		else:
			return s_or_u

	def _execute(self, command, **kwargs):
		import sarge

		if isinstance(command, (list, tuple)):
			joined_command = " ".join(command)
		else:
			joined_command = command
		#_log_call(joined_command)

		# kwargs.update(dict(async=True, stdout=sarge.Capture(), stderr=sarge.Capture()))

		try:
			p = sarge.run(command, async=True, stdout=sarge.Capture(), stderr=sarge.Capture())
			while len(p.commands) == 0:
				# somewhat ugly... we can't use wait_events because
				# the events might not be all set if an exception
				# by sarge is triggered within the async process
				# thread
				time.sleep(0.01)

			# by now we should have a command, let's wait for its
			# process to have been prepared
			p.commands[0].process_ready.wait()

			if not p.commands[0].process:
				# the process might have been set to None in case of any exception
				#print("Error while trying to run command {}".format(joined_command), file=sys.stderr)
				self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Error while trying to run command - 1."))
				self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = p.stderr.readlines(timeout=0.5)))
				self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = p.stdout.readlines(timeout=0.5)))
				return None, [], []
		except:
			#print("Error while trying to run command {}".format(joined_command), file=sys.stderr)
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Error while trying to run command - 2."))
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = p.stderr.readlines(timeout=0.5)))
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = traceback.format_exc()))
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = p.stdout.readlines(timeout=0.5)))
			#traceback.print_exc(file=sys.stderr)
			return None, [], []

		all_stdout = []
		all_stderr = []
		last_print = None;
		try:
			while p.commands[0].poll() is None:
				errorFlag = None
				lines = p.stderr.readlines(timeout=0.5)
				if lines:
					if errorFlag == False:
						self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = "\n\r"))

					lines = map(lambda x: self._to_unicode(x, errors="replace"), lines)
					#_log_stderr(*lines)
					all_stderr += list(lines)
					self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = all_stderr))
					all_stderr = []
					# self.mgLog(lines,2)
					errorFlag = True
					last_print = True;

				lines = p.stdout.readlines(timeout=0.5)
				if lines:
					lines = map(lambda x: self._to_unicode(x, errors="replace"), lines)
					#_log_stdout(*lines)
					all_stdout += list(lines)
					self._logger.info(lines)
					self._logger.info(all_stdout)
					self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = all_stdout))
					all_stdout = []
					last_print = True;
					# self.mgLog(lines,2)
				else :
					#if (errorFlag == None) and (last_print == False):
						#self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = "."))
					last_print = False;


		finally:
			p.close()

		lines = p.stderr.readlines()
		if lines:
			lines = map(lambda x: self._to_unicode(x, errors="replace"), lines)
			#_log_stderr(*lines)
			all_stderr += lines
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = all_stderr))
			all_stderr = []
			self._logger.info(lines)
			# self.mgLog(lines,2)

		lines = p.stdout.readlines()
		if lines:
			lines = map(lambda x: self._to_unicode(x, errors="replace"), lines)
			#_log_stdout(*lines)
			all_stdout += lines

			self._logger.info(all_stdout)
			self._logger.info(all_stderr)
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = all_stdout))
			all_stdout = []
		return p.returncode, all_stdout, all_stderr

	def counterTest(self, actionMaybe):
		self._execute("/home/pi/.octoprint/scripts/counter.sh")
		#p = subprocess.call("/home/pi/.octoprint/scripts/counter.sh", shell=True)
		#while p.poll():
		#	self._logger.info(p.readline())

	def backUpConfigYaml(self):
		try:
			if not os.path.isfile('/home/pi/.octoprint/config.yaml.backup'):
				shutil.copyfile('/home/pi/.octoprint/config.yaml','/home/pi/.octoprint/config.yaml.backup')
				self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = "Copied config.yaml to config.yaml.backup.\n"))
			else:
				newBackup = str(datetime.datetime.now().strftime('%y-%m-%d.%H:%M'))
				shutil.copyfile('/home/pi/.octoprint/config.yaml.backup','/home/pi/.octoprint/config.yaml.backup.'+newBackup)
				shutil.copyfile('/home/pi/.octoprint/config.yaml','/home/pi/.octoprint/config.yaml.backup')
				self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = "Copied config.yaml.backup to config.yaml.backup."+newBackup+" and copied config.yaml to config.yaml.backup.\n"))
		except IOError as e:
			self._logger.info("Tried to backup config.yaml but encountered an error!")
			self._logger.info("Error: "+str(e))
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Tried to backup config.yaml but encountered an error!  Error: "+str(e)+"\n"))
			if not os.path.isfile('/home/pi/.octoprint/config.yaml.backup'):
				raise
			else:
				self._execute("sudo chgrp pi /home/pi/.octoprint/config.yaml.backup")
				self._execute("sudo chown pi /home/pi/.octoprint/config.yaml.backup")
				os.chmod("/home/pi/.octoprint/config.yaml.backup", 0600)
				self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Changed the owner, group and permissions of config.yaml.backup - please try to Update Firmware again to backup config.yaml.\n"))

	def collectLogs(self):
		# src_files = os.listdir(self._basefolder+"/static/maintenance/cura/")
		# mainLogFolder = octoprint.settings.Settings.get(octoprint.settings.settings(),["settings", "folder", "logs"])
		mainLogFolder = "/home/pi/.octoprint/logs"
		mainLogs =  os.listdir(mainLogFolder)
		pluginLogFolder = self._basefolder+"/logs"
		pluginLogs = os.listdir(pluginLogFolder)

		# for file_name in mainLogs:
		# 	allLogs = os.path.join(mainLogFolder, file_name)
		# for file_name in pluginLogs:
		# 	allLogs = allLogs + os.path.join(pluginLogFolder, file_name)

		# self._logger.info(allLogs)
		# zipname = "/home/pi/" + str(datetime.datetime.now().strftime('%y-%m-%d.%H.%M'))+".zip"
		try:
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Preparing Logs, Please Wait.\n\n"))
			lastFive = ''.join(list(self.serial)[3:])
			zipNameDate = "MGSetup-Logs-" + lastFive + "-" + str(datetime.datetime.now().strftime('%y-%m-%d_%H-%M'))
			zipname = self._basefolder+"/static/maintenance/" + zipNameDate +".zip"
			with ZipFile(zipname, 'w', ZIP_DEFLATED) as logzip:
				# for file_name in allLogs:
				# 	logzip.write(file_name)

				for file_name in mainLogs:
					tempfile = os.path.join(mainLogFolder, file_name)
					logzip.write(tempfile, os.path.basename(tempfile))
				for file_name in pluginLogs:
					tempfile = os.path.join(pluginLogFolder, file_name)
					logzip.write(tempfile, os.path.basename(tempfile))


			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Downloading File: "+str(zipNameDate)+".zip"))
			self._plugin_manager.send_plugin_message("mgsetup", dict(logFile = zipNameDate + ".zip"))
		except Exception as e:
			self._logger.info("collectLogs failed, exception: " + str(e))
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "There was an exception while trying to collect logs: "+str(e)))


	def getLocalFirmwareVersion(self):
		self._logger.info("local firmware reports itself as: ")
		if os.path.isfile('/home/pi/m3firmware/src/Marlin/Version.h'):
			with open('/home/pi/m3firmware/src/Marlin/Version.h', 'r') as f:
					self.filelines = f.readlines()
					self._logger.info(self.filelines[37])
					pattern = r'".+"'
					matchedline = re.search(pattern,self.filelines[37]).group()
					self._logger.info(matchedline)
					self._settings.set(["localFirmwareVersion"],matchedline)
					self._settings.save()
					self.localfirmwareline = matchedline
					self._plugin_manager.send_plugin_message("mgsetup", dict(localfirmwareline = self.localfirmwareline))

	def updateLocalFirmware(self):

		#To create a fresh copy of the target folder, git clone -b 1.1.6 https://github.com/MakerGear/m3firmware.git src1.1.6
		self._logger.info("Update Firmware started.")
		self.backUpConfigYaml()
		if not os.path.isfile('/home/pi/m3firmware/src/Marlin/lockFirmware'):
			# self._logger.info(self._execute("git -C /home/pi/m3firmware/src pull"))
			self._logger.info(self._execute("git -C /home/pi/m3firmware/src fetch --all; git -C /home/pi/m3firmware/src reset --hard; git -C /home/pi/m3firmware/src pull"))



			if os.path.isfile('/home/pi/m3firmware/src/Marlin/Configuration_makergear.h.m3ID'):


				self._logger.info(self._printer_profile_manager.get_current_or_default()["extruder"]["count"])
				self.activeProfile = (octoprint.settings.Settings.get( octoprint.settings.settings() , ["printerProfiles","default"] ))
				if self.activeProfile == None:
					self.extruderCount = self._printer_profile_manager.get_current_or_default()["extruder"]["count"]
				else:
					self._logger.info("Profile: "+self.activeProfile)
					self._logger.info("extruders: "+str( ( self._printer_profile_manager.get_all() [ self.activeProfile ]["extruder"]["count"] ) ) )
					self.extruderCount = ( self._printer_profile_manager.get_all() [ self.activeProfile ]["extruder"]["count"] )
 


				# self._logger.info("extruders: "+str( ( self._printer_profile_manager.get_all() [ self.activeProfile ]["extruder"]["count"] ) ) )
				# self.extruderCount = ( self._printer_profile_manager.get_all() [ self.activeProfile ]["extruder"]["count"] )

				# self._printer_profile_manager.get_all().get_current()["extruder"]["counter"]
				# self._logger.info("extruders: "+str(self._printer_profile_manager.get_all().get_current()["extruder"]["counter"]))
				if (self.extruderCount == 2):
					try:
						shutil.copyfile('/home/pi/m3firmware/src/Marlin/Configuration_makergear.h.m3ID','/home/pi/m3firmware/src/Marlin/Configuration_makergear.h')
						self._logger.info("Copied the Dual configuration to Configuration_makergear.h")
						self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = "Copied the Dual configuration to Configuration_makergear.h"))
					except IOError as e:
						self._logger.info("Tried to copy Dual configuration but encountered an error!")
						self._logger.info("Error: "+str(e))
						self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Tried to copy Dual configuration but encountered an error!  Error: "+str(e)))
				else:
					try:
						shutil.copyfile('/home/pi/m3firmware/src/Marlin/Configuration_makergear.h.m3SE','/home/pi/m3firmware/src/Marlin/Configuration_makergear.h')
						self._logger.info("Copied the Single configuration to Configuration_makergear.h")
						self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = "Copied the Single configuration to Configuration_makergear.h"))
					except IOError as e:
						self._logger.info("Tried to copy Single configuration but encountered an error!")
						self._logger.info("Error: "+str(e))
						self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Tried to copy Single configuration but encountered an error!  Error: "+str(e)))
				



			else:



				# self._logger.info(self._printer_profile_manager.get_current_or_default()["extruder"]["count"])
				self.activeProfile = (self._printer_profile_manager.get_current_or_default()["model"])
				# self._logger.info(self._printer_profile_manager.get_current_or_default()["model"])
				self._logger.info("Profile: "+self.activeProfile)

				newProfileString = (re.sub('[^\w]','_',self.activeProfile)).upper()

				with open('/home/pi/m3firmware/src/Marlin/Configuration_makergear.h','r+') as f:
					timeString = str(datetime.datetime.now().strftime('%y-%m-%d.%H:%M'))
					oldConfig = f.read()
					f.seek(0,0)
					if f.readline() == "\n":
						f.seek(0,0)
						f.write("#define MAKERGEAR_MODEL_" + newProfileString + "//AUTOMATICALLY FILLED BY MGSETUP PLUGIN - " + timeString + '\n' + oldConfig)
					else:
						f.seek(0,0)
						oldLine = f.readline()
						f.seek(0,0)
						i = oldConfig.index("\n")
						oldConfigStripped = oldConfig[i+1:]
						f.write("#define MAKERGEAR_MODEL_" + newProfileString + "//AUTOMATICALLY FILLED BY MGSETUP PLUGIN - " + timeString + '\n' + "// " + oldLine + "// OLD LINE BACKED UP - " + timeString + "\n" + oldConfigStripped)






			self.getLocalFirmwareVersion()

		else:
			self._logger.info("Tried to update firmware, but lock file exists!  Aborting.")
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Tried to update firmware, but lock file exists!  Aborting."))

		# settings.printerProfiles.currentProfileData().extruder.count()

	# octoprint.settings.Settings.set(octoprint.settings.settings(),["appearance", "name"],["MakerGear " +self.newhost])

	def writeNetconnectdPassword(self, newPassword):
		subprocess.call("/home/pi/.octoprint/scripts/changeNetconnectdPassword.sh "+newPassword['password'], shell=True)
		self._logger.info("Netconnectd password changed to "+newPassword['password']+" !")

	def changeHostname(self, newHostname):
		subprocess.call("/home/pi/.octoprint/scripts/changeHostname.sh "+newHostname['hostname']+" "+self.newhost, shell=True)
		self._logger.info("Hostname changed to "+newHostname['hostname']+" !")

	def requestValues(self):
		self._printer.commands(["M503"])

	def sendCurrentValues(self):
		self.printerValueVersion = time.time()
		self._plugin_manager.send_plugin_message("mgsetup", dict(zoffsetline = self.zoffsetline,
																tooloffsetline = self.tooloffsetline,
																firmwareline = self.firmwareline,
																probeOffsetLine = self.probeOffsetLine,
																printerValueVersion = self.printerValueVersion)
		)

	def sendValues(self, clientVersion = -1):
		if clientVersion == self.printerValueVersion:
			return
		elif self.printerValueGood:
			self.sendCurrentValues()
		else:
			self.requestValues()

	def get_api_commands(self):
		self._logger.info("MGSetup get_api_commands triggered.")
		#self._logger.info("M114 sent to printer.")
		#self._printer.commands("M114");
		#self.position_state = "stale"
		return dict(turnSshOn=[],
			turnSshOff=[],
			adminAction=["action"],
			writeNetconnectdPassword=["password"],
			changeHostname=['hostname'],
			sendSerial=[],
			storeActivation=['activation'],
			checkActivation=['userActivation'],
			remindLater=[],
			checkGoogle=['url'],
			flushPrintActive=[],
			mgLog=['stringToLog','priority'],
			sendValues=['clientVersion']
			)

	def on_api_get(self, request):
		self._logger.info("MGSetup on_api_get triggered.")
		return flask.jsonify(dict(
			currentposition=self.current_position,
			positionstate=self.position_state)
		)
		self.position_state = "stale"

	def process_z_offset(self, comm, line, *args, **kwargs):

		if "Error: " in line:
			self._logger.info("process_z_offset triggered - Error !")
			self._plugin_manager.send_plugin_message("mgsetup", dict(mgerrorline = line))
		if "Warning: " in line:
			self._logger.info("process_z_offset triggered - Warning !")
			self._plugin_manager.send_plugin_message("mgsetup", dict(mgwarnline = line))

		if self.printActive:
			# self._logger.debug("printActive true, skipping filters.")
			# self._logger.info("printActive true, skipping filters - info")
			return line

		# if "M206" not in line and "M218" not in line and "FIRMWARE_NAME" not in line and "Error" not in line and "z_min" not in line and "Bed X:" not in line and "M851" not in line:
		# 	return line
		newValuesPresent = False
		watchCommands = ["M206", "M218", "FIRMWARE_NAME", "Error", "z_min", "Bed X:", "M851", "= [[ ", "Settings Stored"]

		if not any([x in line for x in watchCommands]):
			return line

		# if ("M206" or "M218" or "FIRMWARE_NAME" or "Error" or "z_min" or "Bed X:" or "M851" or "= [[ ") not in line:
		# 	return line

		# logging.getLogger("octoprint.plugin." + __name__ + "process_z_offset triggered")
		if "MGERR" in line:
			self._logger.info("process_z_offset triggered - MGERR !")
			self._plugin_manager.send_plugin_message("mgsetup", dict(mgerrorline = line))

		if "M206" in line:
			self._logger.info("process_z_offset triggered - Z offset")
			self.zoffsetline = line
			self._plugin_manager.send_plugin_message("mgsetup", dict(zoffsetline = line))
			newValuesPresent = True

		if "M218" in line:
			self._logger.info("process_z_offset triggered - Tool offset")
			self.tooloffsetline = line
			self._plugin_manager.send_plugin_message("mgsetup", dict(tooloffsetline = line))
			newValuesPresent = True

		#__plugin_implementation__._logger.info(line)

		if "FIRMWARE_NAME" in line:
			self._logger.info("plugin version - firmware reports itself as: ")
			self.firmwareline = line
			self._plugin_manager.send_plugin_message("mgsetup", dict(firmwareline = line))

		if "Error:Probing failed" in line:
			self._logger.info("'Error:Probing failed' message received")
			self._plugin_manager.send_plugin_message("mgsetup", dict(errorline = line))
			return ""


		if "z_min" in line:
			self._logger.info("z_min message received")
			self._plugin_manager.send_plugin_message("mgsetup", dict(zminline = line))

		if "Bed X:" in line:
			self._logger.info("Bed Probe data received?")
			self._plugin_manager.send_plugin_message("mgsetup", dict(probeline = line))

		if "M851" in line:
			self._logger.info("Z Probe Offset received")
			self.probeOffsetLine = line
			self._plugin_manager.send_plugin_message("mgsetup", dict(probeOffsetLine = line))
			newValuesPresent = True


		if "= [[ " in line:
			self._logger.info("Bed Leveling Information received")
			self._plugin_manager.send_plugin_message("mgsetup", dict(bedLevelLine = line))

		if "Settings Stored" in line:
			self._logger.info("Looks like a M500 was sent from somewhere.  Sending a M503 to check current values.")
			self.requestValues()

		if newValuesPresent:
			self.printerValueGood = True
			self.sendValues()

		return line

	def resetRegistration(self):
		try:  #a bunch of code with minor error checking and user alert...ion to copy scripts to the right location; should only ever need to be run once
			os.makedirs('/home/pi/.mgsetup')
		except OSError:
			if not os.path.isdir('/home/pi/.mgsetup'):
				raise
		f = open('/home/pi/.mgsetup/actkey', 'w')
		f.write("")
		f.close()
		self._settings.set(["registered"], False)
		self._settings.set(["activated"], False)
		self._settings.save()
		self._logger.info("Activation and Registration Reset!")

	def disableRadios(self):
		self._execute("netconnectcli stop_ap")
		if not os.path.isfile('/boot/config.txt.backup'):
			self._execute('sudo cp /boot/config.txt /boot/config.txt.backup')
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = "Copied config.txt to config.txt.backup ."))
		if not "dtoverlay=pi3-disable-wifi" in open('/boot/config.txt'):
			# f = open('/boot/config.txt', 'a')
			# f.write("\ndtoverlay=pi3-disable-wifi")
			# f.close()
			self._execute('sudo cp /home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/maintenance/scripts/config.txt.wifiDisable /boot/config.txt')
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = "Copied config.txt.wifiDisable to config.txt to Disable Wifi.  Will now reboot."))
			self._execute("sudo reboot")

	def enableRadios(self):
		# if "dtoverlay=pi3-disable-wifi" in open('/boot/config.txt'):
		self._execute('sudo cp /boot/config.txt.backup /boot/config.txt')
		self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = "Copied config.txt.backup to config.txt .  Will now reboot."))
		self._execute("sudo reboot")


	def disableSmb(self):
		# if "dtoverlay=pi3-disable-wifi" in open('/boot/config.txt'):
		self._execute('sudo systemctl disable smbd')

	def enableSmb(self):
		# if "dtoverlay=pi3-disable-wifi" in open('/boot/config.txt'):
		self._execute('sudo systemctl emable smbd')

	def patchSmb(self):
		# if "dtoverlay=pi3-disable-wifi" in open('/boot/config.txt'):

		self._execute('echo "Patching SMB"')
		self._execute('sudo cp /home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/maintenance/system/smbPatched.conf /etc/samba/smb.conf')
		self._execute('sudo chmod 644 /etc/samba/smb.conf')
		self._execute('sudo chown root /etc/samba/smb.conf')
		self._execute('sudo service smbd restart')
		self._execute('echo "Patch Finished"')


	def lockFirmware(self):
		if not os.path.isfile('/home/pi/m3firmware/src/Marlin/lockFirmware'):
			open('/home/pi/m3firmware/src/Marlin/lockFirmware','a').close()
			self._logger.info("Firmware lock file created.")
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Firmware lock file created!"))

	def unlockFirmware(self):
		if os.path.isfile('/home/pi/m3firmware/src/Marlin/lockFirmware'):
			try:
				os.remove('/home/pi/m3firmware/src/Marlin/lockFirmware')
				self._logger.info("Firmware lock file deleted.")
				self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Firmware lock file deleted - now free to update firmware."))
			except IOError as e:
				self._logger.info("Tried to delete firmware lock file, but there was an error!")
				self._logger.info("Error: "+str(e))
				self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Tried to delete firmware lock file but encountered an error!  Error: "+str(e)))
		else:
			self._logger.info("Tried to delete firmware lock file, but it doesn't seem to exist?")
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = "Tried to delete firmware lock file, but it doesn't seem to exist?"))








	def adminAction(self, action, payload={}):
		self._logger.info("adminAction called: "+ str(action))
		if action["action"] == 'turnSshOn':
			#self.turnSshOn()
			self._execute("/home/pi/.octoprint/scripts/startSsh.sh")
			self._logger.info("SSH service started!")
			self.adminAction(dict(action="sshState"))
		elif action["action"] == 'turnSshOff':
			#self.turnSshOff()
			self._execute("/home/pi/.octoprint/scripts/stopSsh.sh")
			self._logger.info("SSH service stopped!")
			self.adminAction(dict(action="sshState"))
		elif action["action"] == 'resetWifi':
			#subprocess.call("/home/pi/.octoprint/scripts/resetWifi.sh")
			self._execute("/home/pi/.octoprint/scripts/resetWifi.sh")
			self._logger.info("Wifi reset!")
		elif action["action"] == 'uploadFirmware':
			#subprocess.call("/home/pi/.octoprint/scripts/upload.sh")

			self._printer.cancel_print()
			self._printer.disconnect()
			self.mgLog(self._execute("python /home/pi/.octoprint/scripts/upload.py"),2)
			self._printer.connect()
			
		elif action["action"] == 'uploadAndFlashFirmware':

			self.updateLocalFirmware()

			self._printer.cancel_print()
			self._printer.disconnect()
			self.mgLog(self._execute("python /home/pi/.octoprint/scripts/upload.py"),2)
			self._printer.connect()
			

		elif action["action"] == 'counterTest':
			self.counterTest(action)
		elif action["action"] == 'expandFilesystem':
			#subprocess.call("/home/pi/.octoprint/scripts/expandFilesystem.sh", shell=True)
			self._execute("/home/pi/.octoprint/scripts/expandFilesystem.sh")
			self._logger.info("Filesystem expanded - will reboot now.")
		elif action["action"] == 'resetRegistration':
			self._logger.info("Registration reset!")
			self.resetRegistration()
		elif action["action"] == 'patch':
			self._logger.info("Patch started.")
			self._execute("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/patch.sh")
		elif action["action"] == 'updateFirmware':
			self.updateLocalFirmware()
		elif action["action"] == 'showIfconfig':
			self._logger.info("Showing ifconfig / netconnectcli status.")
			self._execute("ifconfig")
			self._execute("netconnectcli status")
		elif action["action"] == 'ps':
			self._logger.info("Showing ps.")
			self._execute("ps -eF")
		elif action["action"] == 'routen':
			self._logger.info("Showing route -n.")
			self._execute("route -n")
		elif action["action"] == 'whead':
			self._logger.info("Showing w | head -n1.")
			self._execute("w | head -n1")
		elif action["action"] == 'lockFirmware':
			self.lockFirmware()
		elif action["action"] == 'unlockFirmware':
			self.unlockFirmware()
		elif action["action"] == 'disableRadios':
			self.disableRadios()
		elif action["action"] == 'enableRadios':
			self.enableRadios()
		elif action["action"] == 'disableSmb':
			self.disableSmb()
		elif action["action"] == 'enableSmb':
			self.enableSmb()
		elif action["action"] == 'patchSmb':
			self.patchSmb()
		elif action["action"] == 'flushPrintActive':
			self.printActive = False
			self.mgLog("flushPrintActive called",0)
		elif action["action"] == 'collectLogs':
			self.collectLogs()
			self.mgLog("collectLogs called",0)
			return "collectLogs called"



		elif action["action"] == 'sshState':
			self._logger.info("Showing sudo service ssh status.")
			sshState = self._execute("sudo service ssh status")
			self._logger.info(sshState)
			if 'Active: active' in str(sshState[1]):
				self._logger.info("Active: active in sshState")
				self._settings.set(['sshOn'], True)
				self._settings.save()
			else:
				self._logger.info("Active: active not in sshState")
				self._settings.set(['sshOn'], False)
				self._settings.save()
	
		elif action["action"] == 'logpatch':
			# "/home/pi/OctoPrint/venv/bin/OctoPrint_Mgsetup/octoprint_mgsetup/static/patch/logpatch.sh"
			# self._execute("/home/pi/OctoPrint/venv/bin/OctoPrint-Mgsetup/octoprint_mgsetup/static/patch/logpatch.sh")
			# self._execute("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/logpatch.sh")
			self._logger.info("Logpatch started.")


			subprocess.call("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/logpatch.sh")

			# if not os.path.isfile("/home/pi/.octoprint/logs/dmesg"):
			# 	if os.path.isfile("/var/log/dmesg"):
			# 		try:
			# 			os.symlink("/var/log/dmesg","/home/pi/.octoprint/logs/dmesg")
			# 		except OSError:
			# 			if os.path.isfile("/var/log/dmesg"):
			# 				raise
			# if not os.path.isfile("/home/pi/.octoprint/logs/messages"):
			# 	if os.path.isfile("/var/log/messages"):
			# 		try:
			# 			os.symlink("/var/log/messages","/home/pi/.octoprint/logs/messages")
			# 		except OSError:
			# 			if os.path.isfile("/var/log/messages"):
			# 				raise
			# if not os.path.isfile("/home/pi/.octoprint/logs/syslog"):
			# 	if os.path.isfile("/var/log/syslog"):
			# 		try:
			# 			os.symlink("/var/log/syslog","/home/pi/.octoprint/logs/syslog")
			# 		except OSError:
			# 			if os.path.isfile("/var/log/syslog"):
			# 				raise
			# if not os.path.isfile("/home/pi/.octoprint/logs/syslog.1"):
			# 	if os.path.isfile("/var/log/syslog.1"):
			# 		try:
			# 			os.symlink("/var/log/syslog.1","/home/pi/.octoprint/logs/syslog.1")
			# 		except OSError:
			# 			if os.path.isfile("/var/log/syslog.1"):
			# 				raise
			# if not os.path.isfile("/home/pi/.octoprint/logs/netconnectd.log"):
			# 	if os.path.isfile("/var/log/netconnectd.log"):
			# 		try:
			# 			os.symlink("/var/log/netconnectd.log","/home/pi/.octoprint/logs/netconnectd.log")
			# 		except OSError:
			# 			if os.path.isfile("/var/log/netconnectd.log"):
			# 				raise
			# if not os.path.isfile("/home/pi/.octoprint/logs/netconnectd.log.1"):
			# 	if os.path.isfile("/var/log/netconnectd.log.1"):
			# 		try:
			# 			os.symlink("/var/log/netconnectd.log.1","/home/pi/.octoprint/logs/netconnectd.log.1")
			# 		except OSError:
			# 			if os.path.isfile("/var/log/netconnectd.log.1"):
			# 				raise

		# elif action["action"] == "setCurrentTest":
		# 	self.currentProjectPrintSuccessTime = 0
		# 	if 
		# 	self.currentProjectName = 
		# 	self._settings.set(["currentProjectPrintSuccessTime"],self.currentProjectPrintSuccessTime)
		# 	self._settings.save()

		elif action["action"] == "resetCurrentProject":
			self._logger.info("newProjectName:")
			self._logger.info(action["payload"]["newProjectName"])
			if 'newProjectName' in action["payload"]:
				self.currentProjectName = action["payload"]["newProjectName"]
			else:
				self.currentProjectName = ""				
			self.currentProjectPrintSuccessTime = 0
			self.currentProjectPrintFailTime = 0
			self.currentProjectMachineFailTime = 0
			self._settings.set(["currentProjectPrintSuccessTime"],self.currentProjectPrintSuccessTime)
			self._settings.set(["currentProjectPrintFailTime"],self.currentProjectPrintFailTime)
			self._settings.set(["currentProjectMachineFailTime"],self.currentProjectMachineFailTime)			
			self._settings.set(["currentProjectName"],self.currentProjectName)
			
			self._settings.save()
			self.triggerSettingsUpdate()



	def turnSshOn(self):
		subprocess.call("/home/pi/.octoprint/scripts/startSsh.sh")
		self._logger.info("SSH service started!")
		self.adminAction(dict(action="sshState"))

	def turnSshOff(self):
		subprocess.call("/home/pi/.octoprint/scripts/stopSsh.sh")
		self._logger.info("SSH service stopped!")	
		self.adminAction(dict(action="sshState"))	

	def on_api_command(self, command, data):
		self._logger.info("MGSetup on_api_command triggered.  Command: "+str(command)+" .  Data: "+str(data))
		if command == 'turnSshOn':
			self.turnSshOn()
		elif command == 'turnSshOff':
			self.turnSshOff()
		elif command == 'adminAction':
			self.adminAction(data)
		elif command == 'writeNetconnectdPassword':
			#self.writeNetconnectdPassword(data)
			self._execute("/home/pi/.octoprint/scripts/changeNetconnectdPassword.sh "+data['password'])
			self._logger.info("Netconnectd password changed to "+data['password']+" !")
		elif command == 'changeHostname':
			#self.changeHostname(data)
			self._execute("/home/pi/.octoprint/scripts/changeHostname.sh "+data['hostname']+" "+self.newhost)
			self._logger.info("Hostname changed to "+data['hostname']+" !")
		elif command == 'storeActivation':
			self.storeActivation(data)
		elif command == 'checkActivation':
			self.checkActivation(data)
		elif command == 'remindLater':
			self.remindLater()
		elif command == 'checkGoogle':
			self.checkInternet(3,3, data['url'])
		elif command == 'flushPrintActive':
			self.printActive = False
			self._logger.info("flushPrintActive executed.")
		elif command == 'mgLog':
			self.mgLog(data['stringToLog'],data['priority'])
		elif command == 'sendValues':
			self.sendValues(data['clientVersion'])


	def sendSerial(self):
		self._logger.info("MGSetup sendSerial triggered.")
		self._plugin_manager.send_plugin_message("mgsetup", dict(serial = self.serial))

	def storeActivation(self, activation):
		self._logger.info(activation)
		try:  #a bunch of code with minor error checking and user alert...ion to copy scripts to the right location; should only ever need to be run once
			os.makedirs('/home/pi/.mgsetup')
		except OSError:
			if not os.path.isdir('/home/pi/.mgsetup'):
				raise
		f = open('/home/pi/.mgsetup/actkey', 'w')
		f.write(activation["activation"])
		f.close()
		self._settings.set(["registered"], True)
		self._settings.save()


	def checkActivation(self, userActivation):
		with open('/home/pi/.mgsetup/actkey', 'r') as f:
			self.activation = f.readline().strip()
			if (self.activation == userActivation['userActivation']):
				self._logger.info("Activation successful!")
				self._settings.set(["activated"],True)
				self._settings.save()
				self._plugin_manager.send_plugin_message("mgsetup","activation success")
			else:
				self._logger.info("Activation failed!")
				self._plugin_manager.send_plugin_message("mgsetup","activation failed")

	##plugin auto update
	def get_version(self):
		self._logger.info("MGSetup get_version triggered.")
		return self._plugin_version
	
	def get_update_information(self):
		self._logger.info("MGSetup get_update_information triggered.")
		if (self.pluginVersion == "master"):
			return dict(
				octoprint_mgsetup=dict(
					displayName="Makergear Setup",
					displayVersion=self._plugin_version,
					# version check: github repository
					type="github_release",
					user="MakerGear",
					repo="MakerGear_OctoPrint_Setup",
					current=self._plugin_version,
					release_branch = "master",
					# update method: pip
					pip="https://github.com/MakerGear/MakerGear_OctoPrint_Setup/archive/{target_version}.zip"
				)
			)
		if (self.pluginVersion == "refactor"):
			return dict(
				octoprint_mgsetup=dict(
					displayName="Makergear Setup",
					displayVersion=self._plugin_version,
					
					# version check: github repository
					type="github_release",
					user="MakerGear",
					repo="MakerGear_OctoPrint_Setup",
					current=self._plugin_version,
					release_branch = "refactor",
					prerelease = True,
					# update method: pip
					pip="https://github.com/MakerGear/MakerGear_OctoPrint_Setup/archive/{target_version}.zip"
				)
			)




	def route_hook(self, server_routes, *args, **kwargs):
		from octoprint.server.util.tornado import LargeResponseHandler, UrlProxyHandler, path_validation_factory
		from octoprint.util import is_hidden_path
		self._logger.info("route_hook triggered!")
		#self._logger.info(server_routes)

		return [
            (r"/video/(.*)", LargeResponseHandler, dict(path=self._basefolder+"/video",
                                                           as_attachment=True,
                                                           path_validation=path_validation_factory(lambda path: not is_hidden_path(path),
                                                                                                   status_code=404)))
        ]        
#__plugin_settings_overlay__ = {appearance: {components: {order: {tab: {'- plugin_mgsetup'}}}}}
#__plugin_settings_overlay__ = dict(appearance=dict(components=dict(order=dict(tab=[MGSetupPlugin().firstTabName]))))
#__plugin_settings_overlay__ = dict(server=dict(port=5001))

__plugin_name__ = "MakerGear Setup"

__plugin_implementation__ = MGSetupPlugin()

__plugin_hooks__ = {
    "octoprint.comm.protocol.gcode.received": __plugin_implementation__.process_z_offset,
	"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
    "octoprint.server.http.routes": __plugin_implementation__.route_hook
}
