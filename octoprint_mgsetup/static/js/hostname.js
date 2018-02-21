var hostName = "M3Printer09P89";
    var generate = 1519187380.05;

        var ip = ["155","-1"];
        for (i = 0; i < ip.length; i++) 
        { 
        id1 = ("ip"+ip[i].toString());
        hostDiv = document.getElementById(id1);
        hostDiv.innerHTML = hostName;
        }
        