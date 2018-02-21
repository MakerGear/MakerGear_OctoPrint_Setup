#!/usr/bin/python

from __future__ import print_function
import RPi.GPIO as GPIO
import subprocess, time, socket
import serial
import shutil
import pwd
import grp
import os
import datetime
import sys

GPIO.setwarnings(False)

buttonPin    = 4
rebootHoldTime     = 5     # Duration for button hold (shutdown)
resetPasswordsHoldTime     = 55     # Duration for button hold (shutdown)
sshHoldTime     = 115     # Duration for button hold (shutdown)
tapTime      = .1  # Debounce time for button taps
nextInterval = 0.0   # Time of next recurring operation

#print("test1")

#subprocess.call(["echo "M300 S110 P100" > /dev/ttyS0""])

#print( "M300 S110 P100", file=/dev/ttyS0)


def copyAndLog(fromFile, toFile, logfile):
  try: 
    shutil.copy(fromFile, toFile)
  except EnvironmentError as e:
    logfile.write("")
    logfile.write("")
    logfile.write("-----ERROR-----\n")
    logfile.write("Copy Environmental Error on " + fromFile  + " to "  + toFile + "\n")
    logfile.write(str(e))
    logfile.write("")
  except Exception as e:
    logfile.write("")
    logfile.write("")
    logfile.write("-----ERROR-----\n")
    logfile.write("Copy  Non Enviromental Error on " + fromFile  + " to "  + toFile  + "\n")
    logfile.write(str(e))
    logfile.write("---------------\n")
  else:
    logfile.write("File copied from " + fromFile  + " to "  + toFile  + " sucesfully\n")

def chmodAndLog(file, permission, logfile):
  try: 
    os.chmod(file, permission)
  except EnvironmentError as e:
    logfile.write("")
    logfile.write("")
    logfile.write("-----ERROR-----\n")
    logfile.write("CHMOD Environmental Error on " + file  + " to "  + str(permission)  + "\n")
    logfile.write(str(e))
    logfile.write("---------------\n")
  except Exception as e:
    logfile.write("")
    logfile.write("")
    logfile.write("-----ERROR-----\n")
    logfile.write("CHMOD  Non Enviromental Error on " + file  + " to "  + str(permission)  + "\n")
    logfile.write(str(e))
    logfile.write("---------------\n")
  else:
    logfile.write("File permission changed " + file  + " to "  + str(permission)  + " sucesfully\n")

def chownAndLog(file, uid, gid, logfile):
  try: 
    os.chown(file, uid, gid)
  except EnvironmentError as e:
    logfile.write("")
    logfile.write("")
    logfile.write("-----ERROR-----\n")
    logfile.write("CHOWN Environmental Error on " + file  + " to "  + str(uid)  + "\n")
    logfile.write(str(e))
    logfile.write("---------------\n")
  except Exception as e:
    logfile.write("")
    logfile.write("")
    logfile.write("-----ERROR-----\n")
    logfile.write("CHOWN Non Enviromental Error on " + file  + " to "  + str(uid) + "\n") 
    logfile.write(str(e))
    logfile.write("---------------\n")
  else:
    logfile.write("Chown " + file  + " to "  + str(uid)  + " sucesfully\n")


# Called when button is briefly tapped.  cancel print script
def tap():

  ts = time.time()
  dateTimeVal = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d_%H:%M:%S')

  avrFlag = 0

  #check if AVR dude is running, set flag if it is
  for line in os.popen("pgrep -x \"avrdude\""):
    avrFlag = 1
    #print("avr flag is one")

  if avrFlag == 0:
    #print("cancel and Reset Start")
    subprocess.Popen('sudo -u pi /home/pi/.octoprint/scripts/cancelPrint.sh',shell=True,stdout=subprocess.PIPE)
    
    logText = dateTimeVal + "Cancel script was activated because the RAMBo reset button  / reset line was tapped. This could also occur because of a software reset RAMBo command"
    persistentLogFileName = "/home/pi/.octoprint/logs/cancel_and_shutdown_from_reset.log"
    persistentLogfile = open(persistentLogFileName, "a")
    persistentLogfile.write(logText + "\n")
    persistentLogfile.close()

    subprocess.Popen('sudo -u pi /home/pi/oprint/bin/octoprint client post_json \'/api/plugin/mgsetup\' \'{"command":"mgLog","stringToLog":"' + logText + '","priority":"0"}\'',shell=True,stdout=subprocess.PIPE)



    #print("cancel and Reset Done ")
  #else:
    #print("don't reset thing")







# Called when button is held down.  Prints image, invokes shutdown process.
def shutdownHold():
  time.sleep(2)
  ts = time.time()
  dateTimeVal = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d_%H:%M:%S')

  #print("shutdown")

  ser = serial.Serial("/dev/ttyS0", 115200, timeout=1)
  ser.close()
  ser.open()
  ser.write("M300 S932 P400 \r\n")
  ser.write("M300 S783 P400 \r\n")
  ser.write("M300 S932 P400 \r\n")
  ser.write("M300 S783 P400 \r\n")
  ser.close()



  logText = dateTimeVal + "System was Shutdown because the RAMBo reset button  / reset line was held for more than 10 seconds at " 
  persistentLogFileName = "/home/pi/.octoprint/logs/cancel_and_shutdown_from_reset.log"
  persistentLogfile = open(persistentLogFileName, "a")
  persistentLogfile.write(logText + "\n")
  persistentLogfile.close()

  subprocess.Popen('sudo -u pi /home/pi/oprint/bin/octoprint client post_json \'/api/plugin/mgsetup\' \'{"command":"mgLog","stringToLog":"' + logText + '","priority":"0"}\'',shell=True,stdout=subprocess.PIPE)


  subprocess.call("sync")
  subprocess.call(["shutdown", "-h", "now"])

def resetPasswordHold():


  print( "start")

  ts = time.time()
  time.sleep(2)
  dateTimeVal = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d_%H:%M:%S')
  logFileName = "/home/pi/.octoprint/logs/sytem_restore_" + dateTimeVal  + ".log"

  logfile = open(logFileName, "w")
  print(logFileName)
  logfile.write("test")
  #print("reset")
  ser = serial.Serial("/dev/ttyS0", 115200, timeout=1)

  ser.close()
  ser.open()
  ser.write("M300 S523 P400 \r\n")
  ser.write("M300 S623 P400 \r\n")
  ser.write("M300 S723 P400 \r\n")
  ser.close()
  

  #subprocess.Popen('sudo -u pi /home/pi/.octoprint/scripts/stopOctoprint.sh',shell=True,stdout=subprocess.PIPE)


  subprocess.call(["netconnectcli", "forget_wifi"])


  #copy and log current files to user backups



  copyAndLog("/etc/netconnectd.yaml", "/etc/netconnectd.yaml.userold",logfile)
  copyAndLog("/home/pi/.octoprint/config.yaml", "/home/pi/.octoprint/config.yaml.userold",logfile)
  copyAndLog("/home/pi/.octoprint/users.yaml", "/home/pi/.octoprint/users.yaml.userold",logfile)
  copyAndLog("/etc/network/interfaces", "/etc/network/interfaces.userold",logfile)


  #copy and log canonical backups to working files
  copyAndLog("/home/pi/.octoprint/config.yaml.backup", "/home/pi/.octoprint/config.yaml",logfile)
  copyAndLog("/home/pi/.octoprint/users.yaml.backup", "/home/pi/.octoprint/users.yaml",logfile)
  copyAndLog("/home/pi/.octoprint/scripts/interfaces", "/etc/network/interfaces",logfile)
  copyAndLog("/etc/netconnectd.yaml.backup", "/etc/netconnectd.yaml",logfile)
  copyAndLog("/home/pi/.octoprint/scripts/config.txt.original", "/boot/config.txt",logfile)



  #ensure all permissions are correctly set
  chmodAndLog("/etc/netconnectd.yaml", 0600,logfile)
  chmodAndLog("/etc/network/interfaces", 0644,logfile)
  chmodAndLog("/home/pi/.octoprint/config.yaml", 0600,logfile)
  chmodAndLog("/home/pi/.octoprint/users.yaml", 0600,logfile)

  
  chmodAndLog("/etc/netconnectd.yaml.userold", 0600,logfile)
  chmodAndLog("/etc/network/interfaces.userold", 0644,logfile)
  chmodAndLog("/home/pi/.octoprint/config.yaml.userold", 0600,logfile)
  chmodAndLog("/home/pi/.octoprint/users.yaml.userold", 0600,logfile)

  chmodAndLog("/home/pi/", 0755,logfile)


  #get GID/UID
  uidRoot = pwd.getpwnam("root").pw_uid
  uidPi = pwd.getpwnam("pi").pw_uid
  gidRoot = grp.getgrnam("root").gr_gid
  gidPi = grp.getgrnam("pi").gr_gid


  #ensure ownership on files is correct
  chownAndLog("/etc/netconnectd.yaml.userold", uidRoot, gidRoot,logfile)
  chownAndLog("/etc/network/interfaces.userold", uidRoot, gidRoot,logfile)
  chownAndLog("/home/pi/.octoprint/config.yaml.userold", uidPi, gidPi,logfile)
  chownAndLog("/home/pi/.octoprint/users.yaml.userold", uidPi, gidPi,logfile)
  chownAndLog("/etc/netconnectd.yaml", uidRoot, gidRoot,logfile)
  chownAndLog("/etc/network/interfaces", uidRoot, gidRoot,logfile)
  chownAndLog("/home/pi/.octoprint/config.yaml", uidPi, gidPi,logfile)
  chownAndLog("/home/pi/.octoprint/users.yaml", uidPi, gidPi,logfile)



  # copyAndLog("/home/pi/there/is/no/spoon", "/home/pi/spoon",logfile)
  # chmodAndLog("/home/pi/there/is/no/spoon", 0600,logfile)
  # chownAndLog("/home/pi/there/is/no/spoon", uidRoot, gidRoot,logfile)



  #turn ssh on
  subprocess.call("sync")
  subprocess.call(["update-rc.d", "ssh", "enable"])
  subprocess.call(["invoke-rc.d", "ssh", "start"])


  logfile.close()




  logText = dateTimeVal + "System was restored because the RAMBo reset button  / reset line was held for more than 60 seconds at See " + logFileName + "for more information"
  persistentLogFileName = "/home/pi/.octoprint/logs/cancel_and_shutdown_from_reset.log"
  persistentLogfile = open(persistentLogFileName, "a")
  persistentLogfile.write(logText + "\n")
  persistentLogfile.close()

  subprocess.Popen('sudo -u pi /home/pi/oprint/bin/octoprint client post_json \'/api/plugin/mgsetup\' \'{"command":"mgLog","stringToLog":"' + logText + '","priority":"0"}\'',shell=True,stdout=subprocess.PIPE)


  #restart, force FSCK
  subprocess.call(["shutdown", "-r", "-F", "now"])


def sshOn():
  time.sleep(2)
  #print("reboot")

  ser = serial.Serial("/dev/ttyS0", 115200, timeout=1)
  ser.close()
  ser.open()
  ser.write("M300 S932 P400 \r\n")
  ser.write("M300 S0 P400 \r\n")
  ser.write("M300 S932 P400 \r\n")
  ser.write("M300 S0 P400 \r\n")
  ser.write("M300 S932 P400 \r\n")
  ser.write("M300 S0 P400 \r\n")
  ser.write("M300 S932 P400 \r\n")
  ser.write("M300 S0 P400 \r\n")
  ser.write("M300 S932 P400 \r\n")
  ser.write("M300 S0 P400 \r\n")
  ser.close()

  subprocess.call("sync")
  subprocess.call(["update-rc.d", "ssh", "enable"])
  subprocess.call(["invoke-rc.d", "ssh", "start"])




# Initialization

# Use Broadcom pin numbers (not Raspberry Pi pin numbers) for GPIO
GPIO.setmode(GPIO.BCM)

# Enable LED and button (w/pull-up on latter)
GPIO.setup(buttonPin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# Processor load is heavy at startup; wait a moment to avoid
# stalling during greeting.
#time.sleep(30)

# Poll initial button state and time
prevButtonState = GPIO.input(buttonPin)
prevTime        = time.time()
tapEnable       = False
rebootHoldEnable      = False
resetPasswordHoldEnable      = False
sshHoldEnable      = False

# Main loop
while(True):

  time.sleep(1/10000.0)

  # Poll current button state and time
  buttonState = GPIO.input(buttonPin)
  t           = time.time()

  # Has button state changed?
  if buttonState != prevButtonState:
    prevButtonState = buttonState   # Yes, save new state/time
    prevTime        = t
  else:                             # Button state unchanged
    if (t - prevTime) >= rebootHoldTime:  # Button held more than 'rebootHoldTime'?
      # Yes it has.  Is the hold action as-yet untriggered?
      if rebootHoldEnable == True:        # Yep!
        #print("reboot1")
        while(GPIO.input(buttonPin) == False):
          pass
          # t           = time.time()
          # if (t - prevTime) >= resetPasswordsHoldTime:
          #   print("resetInternal")

        t           = time.time()
        if (t - prevTime) >= sshHoldTime:
          #print("turn ssh on")
          #sshOn()
          pass
        elif (t - prevTime) >= resetPasswordsHoldTime:
          #print("reset passwords")
          resetPasswordHold()
        else :   
          shutdownHold()                      # Perform hold action (usu. shutdown)

        rebootHoldEnable = False          # 1 shot...don't repeat hold action
        resetPasswordHoldEnable = False
        sshHoldEnable = False
        tapEnable  = False          # Don't do tap action on release
    elif (t - prevTime) >= tapTime: # Not rebootHoldTime.  tapTime elapsed?
      # Yes.  Debounced press or release...
      if buttonState == True:       # Button released?
        if tapEnable == True:       # Ignore if prior shutdownHold()
          tap()                     # Tap triggered (button released)
          tapEnable  = False        # Disable tap and hold
          rebootHoldEnable = False
          resetPasswordHoldEnable = False
          sshHoldEnable = False
      else:                         # Button pressed
        tapEnable  = True           # Enable tap and hold actions
        rebootHoldEnable = True
        resetPasswordHoldEnable = True
        sshHoldEnable = True

 
