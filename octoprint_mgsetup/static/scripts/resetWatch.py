#!/usr/bin/python

from __future__ import print_function
import RPi.GPIO as GPIO
import subprocess, time, socket
import serial

GPIO.setwarnings(False)

buttonPin    = 4
rebootHoldTime     = 5     # Duration for button hold (shutdown)
resetPasswordsHoldTime     = 55     # Duration for button hold (shutdown)
tapTime      = .1  # Debounce time for button taps
nextInterval = 0.0   # Time of next recurring operation

#print("test1")

#subprocess.call(["echo "M300 S110 P100" > /dev/ttyS0""])

#print( "M300 S110 P100", file=/dev/ttyS0)










# Called when button is briefly tapped.  Invokes time/temperature script.
def tap():
  pass
  #print("test")
  #subprocess.call(["python", "timetemp.py"])


# Called when button is held down.  Prints image, invokes shutdown process.
def rebootHold():
  time.sleep(2)
  #print("reboot")

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
  #execute script here


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

# Main loop
while(True):

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
        if (t - prevTime) >= resetPasswordsHoldTime:
          #print("resetInternal")
          resetPasswordHold()
        else :   
          rebootHold()                      # Perform hold action (usu. shutdown)

        rebootHoldEnable = False          # 1 shot...don't repeat hold action
        resetPasswordHoldEnable = False
        tapEnable  = False          # Don't do tap action on release
    elif (t - prevTime) >= tapTime: # Not rebootHoldTime.  tapTime elapsed?
      # Yes.  Debounced press or release...
      if buttonState == True:       # Button released?
        if tapEnable == True:       # Ignore if prior rebootHold()
          tap()                     # Tap triggered (button released)
          tapEnable  = False        # Disable tap and hold
          rebootHoldEnable = False
          resetPasswordHoldEnable = False
      else:                         # Button pressed
        tapEnable  = True           # Enable tap and hold actions
        rebootHoldEnable = True
        resetPasswordHoldEnable = True

 