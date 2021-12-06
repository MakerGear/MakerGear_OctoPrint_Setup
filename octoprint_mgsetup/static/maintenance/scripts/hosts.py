
import socket
import fcntl
import struct
import time

newhost =  socket.gethostname()

newIp = 88
myIps = [-1,-1,-1,-1]


wlanip = ["-1","-1","-1","-1"]

ethip = ["-1","-1","-1","-1"]

# todo 12/1/2021 - A), rewrite this to use https://www.delftstack.com/howto/python/get-ip-address-python/ ; B), add in some better error reporting and checking...
# also needs a relative reference to the file to modify (python version, absolute path, etc. might change), and that's ignoring the properties of that hostname.js file in the firstplace

# loose version:

# >>> for ifaceName in interfaces():
# ...     addresses = [i['addr'] for i in ifaddresses(ifaceName).setdefault(AF_INET, [{'addr':'No IP addr'}] )]
# ...     print("{}:{}".format(ifaceName, (' '.join(addresses))))
# ...
# lo:127.0.0.1
# eth0:10.0.0.141
# wlan0:No IP addr



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








try:
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
except IOError as e:
    print "Target file could not be found! Error: "+str(e)




