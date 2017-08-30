
import socket
import fcntl
import struct
import time

newhost =  socket.gethostname()

newIp = 88
myIps = [-1,-1,-1,-1]


wlanip = ["-1","-1","-1","-1"]

ethip = ["-1","-1","-1","-1"]


def get_ip_address(ifname):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        return socket.inet_ntoa(fcntl.ioctl(
            s.fileno(),
            0x8915,  # SIOCGIFADDR
            struct.pack('256s', ifname[:15])
        )[20:24])
    except:
        print "no such device"


try:
    wlanip =  get_ip_address('wlan0').split(".")
except:
        print "no ip on wlan"


try:
    ethip = get_ip_address('eth0').split(".")
except:
        print "no ip on eth"









target = open("/home/pi/oprint/lib/python2.7/site-packages/octoprint_mgsetup/static/js/hostname.js", 'w')


line1 = '''var hostName = \"'''+ newhost +'''\";
var generate = '''+ str(time.time())+ ''';

    var ip = [\"'''+ str(wlanip[3])+'''\",\"'''+ str(ethip[3]) +'''\"];
    for (i = 0; i < ip.length; i++) 
    { 
    id1 = (\"ip\"+ip[i].toString());
    hostDiv = document.getElementById(id1);
    hostDiv.innerHTML = hostName;
    }
    '''




target.write(line1)

target.close()





