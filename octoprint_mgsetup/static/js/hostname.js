var hostName = "M3Printer51G90";
    var generate = 1519240185.69;

        var ip = ["139","121"];
        for (i = 0; i < ip.length; i++) 
        { 
        id1 = ("ip"+ip[i].toString());
        hostDiv = document.getElementById(id1);
        hostDiv.innerHTML = hostName;
        }
        