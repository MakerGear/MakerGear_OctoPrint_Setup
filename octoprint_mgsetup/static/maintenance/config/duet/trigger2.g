; trigger2.g
; Rev 10 1/26/19 KG
; emergency stop called when U1 cancel button on side of machine is pushed

M118 S"Emergency Stop M999 on Trigger 1"
M999
;M118 S"//action:cancel"
;M118 S"//action:cancel" P1
;M118 S"test" P1
;M117 //action:disconnect
;M117 "test"
;G1 X100 F18000
;G1 X90 F18000
