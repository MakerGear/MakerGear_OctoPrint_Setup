<<<<<<< HEAD
var hostName = "M3Printer09P89";
    var generate = 1516380018.6;

        var ip = ["156","-1"];
=======
var hostName = "M3Printer51G90";
    var generate = 1516223037.9;

        var ip = ["139","-1"];
>>>>>>> 5393257abb812c1b2ab772c3e31a0a95c232aedf
        for (i = 0; i < ip.length; i++) 
        { 
        id1 = ("ip"+ip[i].toString());
        hostDiv = document.getElementById(id1);
        hostDiv.innerHTML = hostName;
        }
        