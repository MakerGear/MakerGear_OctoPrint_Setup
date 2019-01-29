; homex.g

; Rev 10 1/26/19 KG
; called to home the X and U axis
;

M574 Z2 S3            ; set endstops to use motor stall

T0
G91               ; relative positioning
G1 S1 Z15 F6000       ; lift Z relative to current position
M574 Z1 S2                           ; restore Set endstops controlled by probe, 


G1 S1 X-600 F1800 ; move quickly to X axis endstop and stop there (first pass)
G1 X5 F6000       ; go back a few mm
G1 S1 X-600 F360  ; move slowly to X axis endstop once more (second pass)
;G92 X-74

;G92 X-71.3





G1 S1 U600 F1800 ; move quickly to U axis endstop and stop there (first pass)
G1 U-5 F6000       ; go back a few mm
G1 S1 U600 F360  ; move slowly to U axis endstop once more (second pass)

G1 S2 Z-15 F6000      ; lower Z again

G90               ; absolute positioning


