; homey.g
; Rev 10 1/26/19 KG
; called to home the Y axis
;

M574 Z2 S3            ; set endstops to use motor stall


G91               ; relative positioning
G1 S1 Z15 F6000       ; lift Z relative to current position
M574 Z1 S2                           ; restore Set endstops controlled by probe, 

G1 S1 Y400 F1800 ; move quickly to Y axis endstop and stop there (first pass)
G92 Y365
G1 Y-5 F6000       ; go back a few mm

G1 S1 Y400 F360  ; move slowly to Y axis endstop once more (second pass)
G92 Y365 ; endstop is higher than limit

G1 Y-25 F6000 

G1 S2 Z-15 F6000      ; lower Z again


G92 Y340
M564 S1

G90               ; absolute positioning

M574 Z1 S2                           ; restore Set endstops controlled by probe, 
