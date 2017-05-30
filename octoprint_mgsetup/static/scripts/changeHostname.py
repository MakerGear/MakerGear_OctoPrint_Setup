# coding=utf-8

from __future__ import absolute_import
import re


import subprocess
import os
import shutil
import hashlib
import logging
import socket
import yaml
import sys


def changeHostname(newHostname):
	# with open('/etc/netconnectd.yaml') as f:
	# 	doc = yaml.load(f)
	# 	doc['psk'] = str(newPassword)

	# with open('/etc/netconnectd.yaml', 'w') as f:
	# 	yaml.dump(doc, f)


	file_name = "/etc/netconnectd.yaml"
	with open(file_name) as f:
		doc = yaml.safe_load(f)
	# print str(doc)
	# print str(newPassword)
	# print str(sys.argv[0])
	# # self._logger.info(str(doc))
	# self._logger.info(type(doc))
	# doc['ap']['psk'] = newPassword['password']
	#doc['ap']['ssid'] = str(sys.argv[0])
	doc['ap']['ssid'] = newHostname.strip()
	# self._logger.info(str(doc))
	with open(file_name, 'w') as f:
		yaml.safe_dump(doc, f, default_flow_style=False)

def changeHosts(newHostname, oldHostname):
	file_name = "/etc/hosts"
	with open(file_name) as f:
		filedata = f.read()

	filedata = filedata.replace(oldHostname, newHostname)
	
	with open(file_name, 'w') as f:
		f.write(filedata)




changeHostname(str(sys.argv[1]))
changeHosts(str(sys.argv[1]), str(sys.argv[2]))
#print str(sys.argv[1])
# print str(sys.stdin.readline())