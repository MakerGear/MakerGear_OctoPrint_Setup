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
import errno
import sys




current_position = "empty for now"
position_state = "stale"
zoffsetline = ""




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


	def on_settings_initialized(self):
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
		else:
			if os.path.isfile('/boot/serial.txt'):
				with open('/boot/serial.txt', 'r') as f:
					self.serial = f.readline().strip()
					self._settings.set(["serialNumber"],[self.serial])
					self._settings.save()
			else:
				self._logger.info("serial.txt does not exist!")
		self._logger.info(self.serial)
		self._settings.get(["registered"])
		self._settings.get(["activated"])
#		octoprint.settings.Settings.set(dict(appearance=dict(components=dict(order=dict(tab=[MGSetupPlugin().firstTabName, "temperature", "control", "gcodeviewer", "terminal", "timelapse"])))))
#		octoprint.settings.Settings.set(dict(appearance=dict(name=["MakerGear "+self.newhost])))
		#__plugin_settings_overlay__ = dict(appearance=dict(components=dict(order=dict(tab=[MGSetupPlugin().firstTabName]))))
		octoprint.settings.Settings.set(octoprint.settings.settings(),["appearance", "name"],["MakerGear " +self.newhost])
		
	def on_after_startup(self):
		self._logger.info("Hello Pablo!")
		self.current_position = current_position
		self._logger.info(self.newhost)
		
		os.chmod("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/patch.sh", 0755)
		os.chmod("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/js/hosts.js", 0666)

		try:  #a bunch of code with minor error checking and user alert...ion to copy scripts to the right location; should only ever need to be run once
			os.makedirs('/home/pi/.octoprint/scripts/gcode')
		except OSError:
			if not os.path.isdir('/home/pi/.octoprint/scripts/gcode'):
				raise
		else:
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


	def get_template_configs(self):
		return [
			dict(type="navbar", custom_bindings=True),
			dict(type="settings", custom_bindings=True)
		]

	def get_settings_defaults(self):
		return dict(hideDebug=True, firstRunComplete=False, registered=False, activated=False, firstTab=True, serialNumber = -1)

	def get_settings_restricted_paths(self):
		return dict(user=[["serialNumber","registered","activated"]])

	def get_assets(self):
		return dict(
			js=["js/mgsetup.js"],
			css=["css/mgsetup.css", "css/overrides.css"],
			img=["img/*"],
			gcode=["gcode/*"],
			videojs=["video-js/*"]
		)
	
	def on_event(self, event, payload):
		if event == Events.POSITION_UPDATE:
			self._logger.info(payload)
			self.current_position = dict(payload)
			self.position_state = "fresh"
##			self._logger.info(current_position)
			return

		if event == Events.CLIENT_OPENED:
			#self._logger.info(payload + " connected")
			#self.serial = ""
			self._plugin_manager.send_plugin_message("mgsetup", dict(zoffsetline = zoffsetline))

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
		try:
			while p.commands[0].poll() is None:
				lines = p.stderr.readlines(timeout=0.5)
				if lines:
					lines = map(lambda x: self._to_unicode(x, errors="replace"), lines)
					#_log_stderr(*lines)
					all_stderr += list(lines)

				lines = p.stdout.readlines(timeout=0.5)
				if lines:
					lines = map(lambda x: self._to_unicode(x, errors="replace"), lines)
					#_log_stdout(*lines)
					all_stdout += list(lines)
					self._plugin_manager.send_plugin_message("mgsetup", dict(commandResponse = lines))

		finally:
			p.close()

		lines = p.stderr.readlines()
		if lines:
			lines = map(lambda x: _to_unicode(x, errors="replace"), lines)
			#_log_stderr(*lines)
			all_stderr += lines
			self._plugin_manager.send_plugin_message("mgsetup", dict(commandError = all_stderr))
			self._logger.info(lines)

		lines = p.stdout.readlines()
		if lines:
			lines = map(lambda x: _to_unicode(x, errors="replace"), lines)
			#_log_stdout(*lines)
			all_stdout += lines

			self._logger.info(all_stdout)
			self._logger.info(all_stderr)
		return p.returncode, all_stdout, all_stderr

	def counterTest(self, actionMaybe):
		self._execute("/home/pi/.octoprint/scripts/counter.sh")
		#p = subprocess.call("/home/pi/.octoprint/scripts/counter.sh", shell=True)
		#while p.poll():
		#	self._logger.info(p.readline())


	def writeNetconnectdPassword(self, newPassword):
		subprocess.call("/home/pi/.octoprint/scripts/changeNetconnectdPassword.sh "+newPassword['password'], shell=True)
		self._logger.info("Netconnectd password changed to "+newPassword['password']+" !")

	def changeHostname(self, newHostname):
		subprocess.call("/home/pi/.octoprint/scripts/changeHostname.sh "+newHostname['hostname']+" "+self.newhost, shell=True)
		self._logger.info("Hostname changed to "+newHostname['hostname']+" !")

	def get_api_commands(self):
		#self._logger.info("M114 sent to printer.")
		#self._printer.commands("M114");
		#self.position_state = "stale"
		return dict(turnSshOn=[],turnSshOff=[],adminAction=["action"],writeNetconnectdPassword=["password"],changeHostname=['hostname'], sendSerial=[], storeActivation=['activation'], checkActivation=['userActivation'])

	def on_api_get(self, request):
		return flask.jsonify(dict(
			currentposition=self.current_position,
			positionstate=self.position_state)
		)
		self.position_state = "stale"

	def process_z_offset(self, comm, line, *args, **kwargs):
		if "M206" not in line:
			return line

		logging.getLogger("octoprint.plugin." + __name__ + "process_z_offset triggered")
		self._logger.info("process_z_offset triggered")
		#self.oldZOffset = 
		#zoffsetline = line
		self._plugin_manager.send_plugin_message("mgsetup", dict(zoffsetline = line))
		#__plugin_implementation__._logger.info(line)
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

	def adminAction(self, action):
		self._logger.info("adminAction called: "+ str(action))
		if action["action"] == 'turnSshOn':
			#self.turnSshOn()
			self._execute("/home/pi/.octoprint/scripts/startSsh.sh")
			self._logger.info("SSH service started!")
		elif action["action"] == 'turnSshOff':
			#self.turnSshOff()
			self._execute("/home/pi/.octoprint/scripts/stopSsh.sh")
			self._logger.info("SSH service stopped!")
		elif action["action"] == 'resetWifi':
			#subprocess.call("/home/pi/.octoprint/scripts/resetWifi.sh")
			self._execute("/home/pi/.octoprint/scripts/resetWifi.sh")
			self._logger.info("Wifi reset!")
		elif action["action"] == 'uploadFirmware':
			#subprocess.call("/home/pi/.octoprint/scripts/upload.sh")
			self._execute("/home/pi/.octoprint/scripts/upload.sh")
			self._logger.info("Firmware uploaded!")
		elif action["action"] == 'counterTest':
			self.counterTest(action)
		elif action["action"] == 'expandFilesystem':
			#subprocess.call("/home/pi/.octoprint/scripts/expandFilesystem.sh", shell=True)
			self._execute("/home/pi/.octoprint/scripts/expandFilesystem.sh")
			self._logger.info("Filesystem expanded - will reboot now.")
		elif action["action"] == 'resetRegistration':
			self.resetRegistration()
			self._logger.info("Registration reset!")
		elif action["action"] == 'patch':
			self._execute("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/patch.sh")
			self._logger.info("Patch started.")


	def turnSshOn(self):
		subprocess.call("/home/pi/.octoprint/scripts/startSsh.sh")
		self._logger.info("SSH service started!")

	def turnSshOff(self):
		subprocess.call("/home/pi/.octoprint/scripts/stopSsh.sh")
		self._logger.info("SSH service stopped!")		

	def on_api_command(self, command, data):
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

	def sendSerial(self):
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
		self._settings.set(["registered"], [True])
		self._settings.save()


	def checkActivation(self, userActivation):
		with open('/home/pi/.mgsetup/actkey', 'r') as f:
			self.activation = f.readline().strip()
			if (self.activation == userActivation['userActivation']):
				self._logger.info("Activation successful!")
				self._settings.set(["activated"],[True])
				self._settings.save()
				self._plugin_manager.send_plugin_message("mgsetup","activation success")
			else:
				self._logger.info("Activation failed!")
				self._plugin_manager.send_plugin_message("mgsetup","activation failed")

	##plugin auto update
	def get_version(self):
		return self._plugin_version
	
	def get_update_information(self):
		return dict(
			octoprint_mgsetup=dict(


				displayName="Makergear Setup",
				displayVersion=self._plugin_version,
				
				# version check: github repository
				type="github_release",
				user="MakerGear",
				repo="MakerGear_OctoPrint_Setup",
				current=self._plugin_version,
				
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
