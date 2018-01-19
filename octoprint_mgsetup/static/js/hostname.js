var hostName = "M3Printer09P89";
    var generate = 1516383485.16;

        var ip = ["156","-1"];
        for (i = 0; i < ip.length; i++) 
        { 
        id1 = ("ip"+ip[i].toString());
        hostDiv = document.getElementById(id1);
        hostDiv.innerHTML = hostName;
        }
        