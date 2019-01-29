; homez.g
; called to home the Z axis
; Rev 10 1/22/19 K.G.


G29 S2
M84 Z
M300 S300 P1000
M574 Z2 S3            ; set endstops to use motor stall
M208 Z370 S0 ;change the max z to higher than normal to account for the bed falling to the very bottom, past where we normally want to operate

G91              ; relative positioning
G1 S1 Z15 F6000       ; lift Z relative to current position
M574 Z1 S2                           ; restore Set endstops controlled by probe, 

G90              ; absolute positioning
G1 X200 Y175 F6000 ; go to first probe point


G30             ; home Z by probing the bed

M208 Z350 S0 ; change back to normal maximum height for z


;G1 S1 Z205 F1200
;G1 Z-5 F360
;G1 S1 Z205 F360

; Uncomment the following lines to lift Z after probing
G91             ; relative positioning
G1 Z15 F6000      ; lift Z relative to current position
G90             ; absolute positioning

