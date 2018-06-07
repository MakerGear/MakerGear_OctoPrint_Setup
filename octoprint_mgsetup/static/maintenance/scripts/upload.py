
# upload script needs to
# 	cancel print / reset rambo
		
# 	check M503

# 	disconnect rambo

# 	compile firmware

# 	upload firmware

# restore M503

# TODO: reset rambo and handle connections before starting incase of weird long moves that would block M503. This is really only a problem if someone
# has long moves going and tries to update from one major version of marlin to another.


import serial
import re
import os
import subprocess
import time
import sys


#_init.py / plugin will discoonect and cancel prints


#continue if not running	
avrFlag = 0

#check if AVR dude is running, set flag if it is
for line in os.popen("pgrep -x \"avrdude\""):
	print ("Warning: AVRdude is already running, Quitting upload process. You may need to restart the printer to clear this warning.")
	sys.stdout.flush()
   
subprocess.check_output('echo $(date) > /home/pi/.octoprint/logs/firmware.log',shell=True)

print( "Canceling prints and disconnecting ")
subprocess.check_output('echo Canceling prints and disconnecting >> /home/pi/.octoprint/logs/firmware.log',shell=True)

print( "Starting Update and Upload Process")
subprocess.check_output('echo Starting Update and Upload Process >> /home/pi/.octoprint/logs/firmware.log',shell=True)

sys.stdout.flush()
#                                              /$$ /$$
#                                             |__/| $$
#   /$$$$$$$  /$$$$$$  /$$$$$$/$$$$   /$$$$$$  /$$| $$  /$$$$$$
#  /$$_____/ /$$__  $$| $$_  $$_  $$ /$$__  $$| $$| $$ /$$__  $$
# | $$      | $$  \ $$| $$ \ $$ \ $$| $$  \ $$| $$| $$| $$$$$$$$
# | $$      | $$  | $$| $$ | $$ | $$| $$  | $$| $$| $$| $$_____/
# |  $$$$$$$|  $$$$$$/| $$ | $$ | $$| $$$$$$$/| $$| $$|  $$$$$$$
#  \_______/ \______/ |__/ |__/ |__/| $$____/ |__/|__/ \_______/
#                                   | $$
#                                   | $$
#                                   |__/
#clean and compile first - this will hopefully give some extra time incase of some sort of long move or other issue going on with the printer
os.chdir("/home/pi/m3firmware/")

try:
	subprocess.check_output('platformio run --target clean >> /home/pi/.octoprint/logs/firmware.log',shell=True)
	print "Cleaned Complilation Build - Starting Compiling"
	sys.stdout.flush()
except subprocess.CalledProcessError:
	print "Failed to Clean directory, quitting"
	sys.stdout.flush()
	quit()


try:
	subprocess.check_output('platformio run >> /home/pi/.octoprint/logs/firmware.log',shell=True)
	print "Compilation Successful "
	sys.stdout.flush()
except subprocess.CalledProcessError:
	print "Failed to Compile Script, quitting"
	sys.stdout.flush()
	quit()



#   /$$$$$$   /$$                                         /$$$$$$$   /$$$$$$   /$$$$$$
#  /$$__  $$ | $$                                        | $$____/  /$$$_  $$ /$$__  $$
# | $$  \__//$$$$$$    /$$$$$$   /$$$$$$   /$$$$$$       | $$      | $$$$\ $$|__/  \ $$
# |  $$$$$$|_  $$_/   /$$__  $$ /$$__  $$ /$$__  $$      | $$$$$$$ | $$ $$ $$   /$$$$$/
#  \____  $$ | $$    | $$  \ $$| $$  \__/| $$$$$$$$      |_____  $$| $$\ $$$$  |___  $$
#  /$$  \ $$ | $$ /$$| $$  | $$| $$      | $$_____/       /$$  \ $$| $$ \ $$$ /$$  \ $$
# |  $$$$$$/ |  $$$$/|  $$$$$$/| $$      |  $$$$$$$      |  $$$$$$/|  $$$$$$/|  $$$$$$/
#  \______/   \___/   \______/ |__/       \_______/       \______/  \______/  \______/



print ("Storing previous firmware settings")
subprocess.check_output('echo Storing  previous firmware settings >> /home/pi/.octoprint/logs/firmware.log',shell=True)
sys.stdout.flush()

ser = serial.Serial('/dev/ttyS0', 115200, timeout=2, xonxoff=False, rtscts=False, dsrdtr=False) #start serial port to upload script
ser.flushInput()	#clear any latent input
ser.flushOutput()   #clear any latent output

#firmware  info variables
responseLine = None
responseLineProbe = None
version = None
printerName = None
extruderCount = None
zprobe = None
matcher = None

ser.write("M115\n\r") #request firmware info

lineCount = 0	#keep track of how many lines we read
while lineCount < 20 : #max out to 100 lines
	data_raw = ser.readline() #read one serial line
	lineCount = lineCount + 1 #incerease number of lines we've read

	if data_raw.startswith("ok") :	#ok means we're done  - should put something 
		#print "done"
		lineCount = 20

	#look if its a line we need
	elif data_raw.startswith("Cap:Z_PROBE:") :
		responseLineProbe = data_raw

	#look if its a line we need
	elif data_raw.startswith("FIRMWARE_NAME") :
		responseLine = data_raw

#match to figure out version, machine type, and extruder count
matcher = re.match (r'FIRMWARE_NAME:Marlin ([0-9]\.[0-9]\.[0-9]\.?[0-9]?\.?[0-9]?) \(Github\) SOURCE_CODE_URL:https://github.com/MakerGear/m3firmware PROTOCOL_VERSION:1.0 MACHINE_TYPE:(.*) EXTRUDER_COUNT:([1-2])', responseLine)
zprobeMatcher = re.match (r'Cap:Z_PROBE:([0-1])', responseLineProbe)

if (matcher == None) or (zprobeMatcher == None):
	print ("Warning: Could not detect previous marlin firmware and settings.")
	subprocess.check_output('echo Warning: Could not detect previous marlin firmware and settings. >> /home/pi/.octoprint/logs/firmware.log',shell=True)

#get version, printerName, extruder count
if matcher:
	version = matcher.group(1) 
	printerName = matcher.group(2) 
	extruderCount = matcher.group(3) 

#get zprobe values
if zprobeMatcher:
	zprobe = zprobeMatcher.group(1)

ser.flushInput()	#clear any latent input
ser.flushOutput()   #clear any latent output


ser.write("M503\n\r")	#request EEPROM info


#value variables
m206X = None
m206Y = None
m206Z = None
m218X = None
m218Y = None
m218Z = None
m851Z = None

#string to send back to firmware
m206String = None
m218String = None
m851String = None


lineCount = 0
while lineCount < 100 : #max out to 100 lines
	data_raw = ser.readline() #read one serial line
	#print(data_raw)
	lineCount = lineCount + 1
	responseLine = data_raw

	#look if its a line we need

	if data_raw.startswith("ok") :
		#print "done"
		lineCount = 100

	elif data_raw.startswith("echo:  M206") :
		matcher = re.match (r'echo:  M206 X(-?[0-9]{1,3}\.[0-9][0-9]) Y(-?[0-9]{1,3}\.[0-9][0-9]) Z(-?[0-9]{1,3}\.[0-9][0-9])', responseLine)
		if matcher:
			m206X = matcher.group(1) 
			m206Y = matcher.group(2) 
			m206Z = matcher.group(3) 

	elif data_raw.startswith("echo:  M218") :
		matcher = re.match (r'echo:  M218 T1 X(-?[0-9]{1,3}\.[0-9][0-9]) Y(-?[0-9]{1,3}\.[0-9][0-9]) Z(-?[0-9]{1,3}\.[0-9][0-9])', responseLine)
		if matcher:
			m218X = matcher.group(1) 
			m218Y = matcher.group(2) 
			m218Z = matcher.group(3) 


	elif data_raw.startswith("echo:  M851") :
		matcher = re.match (r'echo:  M851 Z(-?[0-9]\.[0-9][0-9])', responseLine)
		if matcher:
			m851Z = matcher.group(1) 


if m206X != None and  m206Y != None and  m206Z != None  :
	#print ("M206 X" + m206X + " Y" + m206Y + " Z" + m206Z)
	sys.stdout.flush()
	m206String = "M206 X" + m206X + " Y" + m206Y + " Z" + m206Z + "\n\r"
	#print m206String

else:
	print ("Could not read previous M503 M206 - Please proceed to Quick Check after firmware has uploaded")
	subprocess.check_output('echo Could not read previous M503 M206 - Please proceed to Quick Check after firmware has uploaded >> /home/pi/.octoprint/logs/firmware.log',shell=True)

	sys.stdout.flush()

if int(extruderCount) == 2:

	if m218X != None and  m218Y != None and  m218Z != None  :
		m218String = "M218 T1 X" + m218X + " Y" + m218Y + " Z" + m218Z + "\n\r"
	else:
		print ("Could not read previous M503 M218 - Please proceed to Quick Check after firmware has uploaded")
		subprocess.check_output('echo Could not read previous M503 M218 - Please proceed to Quick Check after firmware has uploaded >> /home/pi/.octoprint/logs/firmware.log',shell=True)

		sys.stdout.flush()
elif int(extruderCount) == None:
	print ("Could not read number of extruders - Please proceed to Quick Check after firmware has uploaded")
	subprocess.check_output('echo Could not read number of extruders - Please proceed to Quick Check after firmware has uploaded >> /home/pi/.octoprint/logs/firmware.log',shell=True)



if int(zprobe) == 1:
	if m851Z != None  :
		sys.stdout.flush()
		m851String = "M851 Z" + m851Z + "\n\r"

	else:
		print ("Could not read previous M503 M851 - Please proceed to Quick Check after firmware has uploaded")
		subprocess.check_output('echo Could not read previous M503 M851 - Please proceed to Quick Check after firmware has uploaded >> /home/pi/.octoprint/logs/firmware.log',shell=True)

		sys.stdout.flush()
#else :
	#print "No Probe"


ser.close #close serial port so that AVRdude can use it


#                      /$$                           /$$
#                     | $$                          | $$
#  /$$   /$$  /$$$$$$ | $$  /$$$$$$   /$$$$$$   /$$$$$$$
# | $$  | $$ /$$__  $$| $$ /$$__  $$ |____  $$ /$$__  $$
# | $$  | $$| $$  \ $$| $$| $$  \ $$  /$$$$$$$| $$  | $$
# | $$  | $$| $$  | $$| $$| $$  | $$ /$$__  $$| $$  | $$
# |  $$$$$$/| $$$$$$$/| $$|  $$$$$$/|  $$$$$$$|  $$$$$$$
#  \______/ | $$____/ |__/ \______/  \_______/ \_______/
#           | $$
#           | $$
#           |__/
print ("Starting Upload")
subprocess.check_output('echo Starting Upload >> /home/pi/.octoprint/logs/firmware.log',shell=True)
sys.stdout.flush()





try:
	subprocess.check_output('/home/pi/.platformio/packages/tool-avrdude/avrdude -cwiring -p atmega2560 -P/dev/ttyS0 -b115200 -D -Uflash:w:.pioenvs/megaatmega2560/firmware.hex >> /home/pi/.octoprint/logs/firmware.log',shell=True)
	print "Upload Sucessful "
	subprocess.check_output('echo Upload Sucessful >> /home/pi/.octoprint/logs/firmware.log',shell=True)
	sys.stdout.flush()
except subprocess.CalledProcessError:
	print "Failed to Upload, quitting"
	subprocess.check_output('echo Failed to Upload, quitting >> /home/pi/.octoprint/logs/firmware.log',shell=True)
	sys.stdout.flush()
	quit()


time.sleep(5)

print "Restoring parameters "
subprocess.check_output('echo Restoring parameters >> /home/pi/.octoprint/logs/firmware.log',shell=True)
sys.stdout.flush()


ser = serial.Serial('/dev/ttyS0', 115200, timeout=2, xonxoff=False, rtscts=False, dsrdtr=False) #start serial port to upload script
ser.flushInput()	#clear any latent input
ser.flushOutput()   #clear any latent output


if m206String != None:
	ser.write(m206String)
	subprocess.check_output("echo M206 X" + m206X + " Y" + m206Y + " Z" + m206Z + " >> /home/pi/.octoprint/logs/firmware.log",shell=True)

	#print "write M206"
if m851String != None:
	ser.write(m851String)
	subprocess.check_output("echo M851 Z" + m851Z + " >> /home/pi/.octoprint/logs/firmware.log",shell=True)
	#print "write M851"

if int(extruderCount) == 2:
	if m218String != None:
		ser.write(m218String)
	subprocess.check_output("echo M218 T1 X" + m218X + " Y" + m218Y + " Z" + m218Z + " >> /home/pi/.octoprint/logs/firmware.log",shell=True)
	#print "write M218"



ser.write("M500\n\r") #save parameters





ser.close

print "Finished!"
sys.stdout.flush()


