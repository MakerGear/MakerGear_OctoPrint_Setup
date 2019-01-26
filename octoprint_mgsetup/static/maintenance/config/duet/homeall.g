;homeall.g 
;Rev 10 1/22/19 kg
;called on G28

M574 Z2 S3            ; set endstops to use motor stall
M208 Z370 S0 ;change the max z to higher than normal to account for the bed falling to the very bottom, past where we normally want to operate

T0
G91               ; relative positioning
G1 S1 Z15 F6000       ; lift Z relative to current position
M574 Z1 S2                           ; restore Set endstops controlled by probe, 

G1 S1 X-600 U600 Y400 F1800 ; move quickly to X axis endstop and stop there (first pass)
G92 Y365


G1 X5 Y-5 U-5 F6000       ; go back a few mm
G1 S1 X-600 U600 Y400 F360  ; move slowly to X axis endstop once more (second pass)
G92 Y365 ; endstop is further than limit
G1 Y-25 F6000
G92 X-71.3 Y340 U600




G90              ; absolute positioning
T0
G1 X200 Y175 F6000 ; go to first probe point
M400 ;added by Josh on 10/23/2018 to test fixing whatever weirdness prevents a U1 from moving to center of the bed before probing.
;T0

G30             ; home Z by probing the bed

M208 Z350 S0 ; change back to normal maximum height for z

;M564 S1

; Uncomment the following lines to lift Z after probing
G91             ; relative positioning
G1 Z5 F6000      ; lift Z relative to current position
G90             ; absolute positioning

G32 ; why does this drive the extrduer?
G28 Z
G29 



