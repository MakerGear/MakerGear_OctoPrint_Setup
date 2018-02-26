var hostName = "M3Printer51G90";
    var generate = 1519618972.03;

        var ip = ["141","-1"];
        for (i = 0; i < ip.length; i++) 
        { 
        id1 = ("ip"+ip[i].toString());
        hostDiv = document.getElementById(id1);
        hostDiv.innerHTML = hostName;
        }
        