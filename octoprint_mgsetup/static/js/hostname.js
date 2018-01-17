var hostName = "M3Printer51G90";
    var generate = 1516223037.9;

        var ip = ["139","-1"];
        for (i = 0; i < ip.length; i++) 
        { 
        id1 = ("ip"+ip[i].toString());
        hostDiv = document.getElementById(id1);
        hostDiv.innerHTML = hostName;
        }
        