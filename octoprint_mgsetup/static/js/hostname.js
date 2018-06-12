var hostName = "M3Printer37K03";
    var generate = 1528827433.97;

        var ip = ["125","210"];
        for (i = 0; i < ip.length; i++) 
        { 
        id1 = ("ip"+ip[i].toString());
        hostDiv = document.getElementById(id1);
        hostDiv.innerHTML = hostName;
        }
        