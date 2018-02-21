#!/usr/bin/python

from __future__ import print_function
import RPi.GPIO as GPIO
import subprocess, time, socket
import serial
import shutil
import pwd
import grp
import os


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


def copyAndLog(fromFile, toFile):

  try: 
    shutil.copy(fromFile, toFile)
  except EnvironmentError as e:
    print "Copy Environmental Error on ", fromFile , "to" , toFile 
    print e
    print ""
  except Exception as e:
    print "Copy  Non Enviromental Error on ", fromFile , "to" , toFile 
    print e
    print ""
  else:
    print "File copied from ", fromFile , "to" , toFile , "sucesfully"

def chmodAndLog(file, permission):

  try: 
    os.chmod(file, permission)
  except EnvironmentError as e:
    print "CHMOD Environmental Error on ", file , "to" , permission 
    print e
    print ""
  except Exception as e:
    print "CHMOD  Non Enviromental Error on ", file , "to" , permission 
    print e
    print ""
  else:
    print "File permission changed ", file , "to" , permission , "sucesfully"

def chownAndLog(file, uid, gid):

  try: 
    os.chown(file, uid, gid)
  except EnvironmentError as e:
    print "CHOWN Environmental Error on ", file , "to" , uid 
    print e
    print ""
  except Exception as e:
    print "CHOWN Non Enviromental Error on ", file , "to" , uid 
    print e
    print ""
  else:
    print "Chown ", file , "to" , uid , "sucesfully"










# Called when button is briefly tapped.  Invokes time/temperature script.
def tap():

  avrFlag = 0

  #check if AVR dude is running, set flag if it is
  for line in os.popen("pgrep -x \"avrdude\""):
    avrFlag = 1
    #print("avr flag is one")

  if avrFlag == 0:
    #print("cancel and Reset Start")
    subprocess.Popen('sudo -u pi /home/pi/.octoprint/scripts/cancelPrint.sh',shell=True,stdout=subprocess.PIPE)
    #print("cancel and Reset Done ")
  #else:
    #print("don't reset thing")

# Called when button is held down.  Prints image, invokes shutdown process.
def shutdownHold():
  time.sleep(2)
  #print("shutdown")

  ser = serial.Serial("/dev/ttyS0", 115200, timeout=1)
  ser.close()
  ser.open()
  ser.write("M300 S932 P400 \r\n")
  ser.write("M300 S783 P400 \r\n")
  ser.write("M300 S932 P400 \r\n")
  ser.write("M300 S783 P400 \r\n")
  ser.close()

  subprocess.call("sync")
  subprocess.call(["shutdown", "-h", "now"])



def resetPasswordHold():
  time.sleep(2)
  #print("reset")
  ser = serial.Serial("/dev/ttyS0", 115200, timeout=1)
  ser.close()
  ser.open()
  ser.write("M300 S523 P400 \r\n")
  ser.write("M300 S623 P400 \r\n")
  ser.write("M300 S723 P400 \r\n")
  ser.close()
  

  subprocess.Popen('sudo -u pi /home/pi/.octoprint/scripts/stopOctoprint.sh',shell=True,stdout=subprocess.PIPE)


  subprocess.call(["netconnectcli", "forget_wifi"])


  #copy and log current files to user backups
  copyAndLog(fromFile, toFile):

  copyAndLog("/etc/netconnectd.yaml", "/etc/netconnectd.yaml.userold")
  copyAndLog("/home/pi/.octoprint/config.yaml", "/home/pi/.octoprint/config.yaml.userold")
  copyAndLog("/home/pi/.octoprint/users.yaml", "/home/pi/.octoprint/users.yaml.userold")
  copyAndLog("/etc/network/interfaces", "/etc/network/interfaces.userold")


  #copy and log canonical backups to working files
  copyAndLog("/home/pi/.octoprint/config.yaml.backup", "/home/pi/.octoprint/config.yaml")
  copyAndLog("/home/pi/.octoprint/users.yaml.backup", "/home/pi/.octoprint/users.yaml")
  copyAndLog("/home/pi/.octoprint/scripts/interfaces", "/etc/network/interfaces")
  copyAndLog("/etc/netconnectd.yaml.backup", "/etc/netconnectd.yaml")
  copyAndLog("/home/pi/.octoprint/scripts/config.txt.original", "/boot/config.txt")


  #ensure all permissions are correctly set
  chmodAndLog("/etc/netconnectd.yaml", 0600)
  chmodAndLog("/etc/network/interfaces", 0644)
  chmodAndLog("/home/pi/.octoprint/config.yaml", 0600)
  chmodAndLog("/home/pi/.octoprint/users.yaml", 0600)

  
  chmodAndLog("/etc/netconnectd.yaml.userold", 0600)
  chmodAndLog("/etc/network/interfaces.userold", 0644)
  chmodAndLog("/home/pi/.octoprint/config.yaml.userold", 0600)
  chmodAndLog("/home/pi/.octoprint/users.yaml.userold", 0600)

  chmodAndLog("/home/pi/", 0755)


  #get GID/UID
  uidRoot = pwd.getpwnam("root").pw_uid
  uidPi = pwd.getpwnam("pi").pw_uid
  gidRoot = grp.getgrnam("root").gr_gid
  gidPi = grp.getgrnam("pi").gr_gid


  #ensure ownership on files is correct
  chownAndLog("/etc/netconnectd.yaml.userold", uidRoot, gidRoot)
  chownAndLog("/etc/network/interfaces.userold", uidRoot, gidRoot)
  chownAndLog("/home/pi/.octoprint/config.yaml.userold", uidPi, gidPi)
  chownAndLog("/home/pi/.octoprint/users.yaml.userold", uidPi, gidPi)
  chownAndLog("/etc/netconnectd.yaml", uidRoot, gidRoot)
  chownAndLog("/etc/network/interfaces", uidRoot, gidRoot)
  chownAndLog("/home/pi/.octoprint/config.yaml", uidPi, gidPi)
  chownAndLog("/home/pi/.octoprint/users.yaml", uidPi, gidPi)





  #turn ssh on
  subprocess.call("sync")
  subprocess.call(["update-rc.d", "ssh", "enable"])
  subprocess.call(["invoke-rc.d", "ssh", "start"])

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

 
