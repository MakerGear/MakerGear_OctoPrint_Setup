#!/usr/bin/python

from __future__ import print_function
import RPi.GPIO as GPIO
import subprocess, time, socket
import serial

GPIO.setwarnings(False)

buttonPin    = 4
holdTime     = 5     # Duration for button hold (shutdown)
tapTime      = .1  # Debounce time for button taps
nextInterval = 0.0   # Time of next recurring operation

print("test1")

#subprocess.call(["echo "M300 S110 P100" > /dev/ttyS0""])

#print( "M300 S110 P100", file=/dev/ttyS0)










# Called when button is briefly tapped.  Invokes time/temperature script.
def tap():
  print("test")
  #subprocess.call(["python", "timetemp.py"])


# Called when button is held down.  Prints image, invokes shutdown process.
def hold():
  time.sleep(2)

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
holdEnable      = False

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
    if (t - prevTime) >= holdTime:  # Button held more than 'holdTime'?
      # Yes it has.  Is the hold action as-yet untriggered?
      if holdEnable == True:        # Yep!
        while(GPIO.input(buttonPin) == False):
          pass
        hold()                      # Perform hold action (usu. shutdown)
        holdEnable = False          # 1 shot...don't repeat hold action
        tapEnable  = False          # Don't do tap action on release
    elif (t - prevTime) >= tapTime: # Not holdTime.  tapTime elapsed?
      # Yes.  Debounced press or release...
      if buttonState == True:       # Button released?
        if tapEnable == True:       # Ignore if prior hold()
          tap()                     # Tap triggered (button released)
          tapEnable  = False        # Disable tap and hold
          holdEnable = False
      else:                         # Button pressed
        tapEnable  = True           # Enable tap and hold actions
        holdEnable = True

 