# coding=utf-8

from __future__ import absolute_import

import octoprint.plugin
from octoprint.events import Events


import subprocess
import flask
import os
import shutil
import hashlib
import logging
import socket





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


	def on_settings_initialized(self):
		self.firstTab = self._settings.get(["firstTab"])
		if self.firstTab:
					self.firstTabName = "plugin_mgsetup"
		else:
			self.firstTabName = "temperature"
		self.firstRunComplete = self._settings.get(["firstRunComplete"])
		self.hideDebug = self._settings.get(["hideDebug"])
		if self._settings.get(["serialNumber"]) != -1:
			self.serial = self._settings.get(["serialNumber"])
		else:
			if os.path.isfile('/boot/serial.txt'):
				with open('/boot/serial.txt', 'r') as f:
					self.serial = f.readline().strip()
			else:
				self._logger.info("serial.txt does not exist!")
		self._logger.info(self.serial)
		self._settings.get(["registered"])

		
	def on_after_startup(self):
		self._logger.info("Hello Pablo!")
		self.current_position = current_position
		self._logger.info(self.newhost)
		

		try:  #a bunch of code with minor error checking and user alert...ion to copy scripts to the right location; should only ever need to be run once
			os.makedirs('/home/pi/.octoprint/scripts/gcode')
		except OSError:
			if not os.path.isdir('/home/pi/.octoprint/scripts/gcode'):
				raise
		else:
			shutil.copy(self._basefolder+"/static/gcode/homeWiggle","/home/pi/.octoprint/scripts/gcode/homeWiggle")
			shutil.copy(self._basefolder+"/static/gcode/homeWiggleAll","/home/pi/.octoprint/scripts/gcode/homeWiggleAll")
			shutil.copy(self._basefolder+"/static/gcode/newWiggle","/home/pi/.octoprint/scripts/gcode/newWiggle")
			shutil.copy(self._basefolder+"/static/gcode/newWiggleAll","/home/pi/.octoprint/scripts/gcode/newWiggleAll")
			self._logger.info("Had to copy scripts to folder.")

		if not os.path.isfile('/home/pi/.octoprint/scripts/gcode/homeWiggle'):
			shutil.copy(self._basefolder+"/static/gcode/homeWiggle","/home/pi/.octoprint/scripts/gcode/homeWiggle")
			self._logger.info("Had to copy homeWiggle to folder.")
		if not os.path.isfile('/home/pi/.octoprint/scripts/gcode/homeWiggleAll'):
			shutil.copy(self._basefolder+"/static/gcode/homeWiggleAll","/home/pi/.octoprint/scripts/gcode/homeWiggleAll")
			self._logger.info("Had to copy homeWiggleAll to folder.")
		if not os.path.isfile('/home/pi/.octoprint/scripts/gcode/newWiggle'):
			shutil.copy(self._basefolder+"/static/gcode/newWiggle","/home/pi/.octoprint/scripts/gcode/newWiggle")
			self._logger.info("Had to copy newWiggle to folder.")			
		if not os.path.isfile('/home/pi/.octoprint/scripts/gcode/newWiggleAll'):
			shutil.copy(self._basefolder+"/static/gcode/newWiggleAll","/home/pi/.octoprint/scripts/gcode/newWiggleAll")
			self._logger.info("Had to copy newWiggleAll to folder.")

		scriptnewWiggle = (hashlib.md5(open('/home/pi/.octoprint/scripts/gcode/newWiggle', 'rb').read()).hexdigest())
		scriptnewWiggleAll = (hashlib.md5(open('/home/pi/.octoprint/scripts/gcode/newWiggleAll', 'rb').read()).hexdigest())
		stocknewWiggle = (hashlib.md5(open(self._basefolder+"/static/gcode/newWiggle", 'rb').read()).hexdigest())
		stocknewWiggleAll = (hashlib.md5(open(self._basefolder+"/static/gcode/newWiggleAll", 'rb').read()).hexdigest())

		if scriptnewWiggle != stocknewWiggle:
			os.remove("/home/pi/.octoprint/scripts/gcode/newWiggle")
			shutil.copy(self._basefolder+"/static/gcode/newWiggle","/home/pi/.octoprint/scripts/gcode/newWiggle")
			self._logger.info("Had to overwrite newWiggle with new version.")
		if scriptnewWiggleAll != stocknewWiggleAll:
			os.remove("/home/pi/.octoprint/scripts/gcode/newWiggleAll")
			shutil.copy(self._basefolder+"/static/gcode/newWiggleAll","/home/pi/.octoprint/scripts/gcode/newWiggleAll")
			self._logger.info("Had to overwrite newWiggleAll with new version.")					

	def get_template_configs(self):
		return [
			dict(type="navbar", custom_bindings=True),
			dict(type="settings", custom_bindings=True)
		]

	def get_settings_defaults(self):
		return dict(hideDebug=True, firstRunComplete=False, registered=False, firstTab=True, serialNumber = -1)

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
			self._plugin_manager.send_plugin_message("mgsetup", dict(zoffsetline = zoffsetline, hostname = self.newhost, serial = self.serial, registered = self.registered))


	def get_api_commands(self):
		#self._logger.info("M114 sent to printer.")
		#self._printer.commands("M114");
		#self.position_state = "stale"
		return dict(turnSshOn=[],turnSshOff=[])

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
__plugin_settings_overlay__ = dict(appearance=dict(components=dict(order=dict(tab=[MGSetupPlugin().firstTabName]))))
#__plugin_settings_overlay__ = dict(server=dict(port=5001))

__plugin_name__ = "MakerGear Setup"

__plugin_implementation__ = MGSetupPlugin()

__plugin_hooks__ = {
    "octoprint.comm.protocol.gcode.received": __plugin_implementation__.process_z_offset,
	"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
    "octoprint.server.http.routes": __plugin_implementation__.route_hook
}
