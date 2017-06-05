# patch.py

# /home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/


# 		sys.stdout.write(str(i)+'\n')
# 		sys.stdout.flush()

# These files get deleted

# DELETE
# /home/pi/.octoprint/uploads/demos/pla/Clip_Bug_Cura.gco
# /home/pi/.octoprint/uploads/demos/pla/EarthElemental_S3d.gcode
# /home/pi/.octoprint/uploads/demos/stl/Clip_Bug.stl
# /home/pi/.octoprint/uploads/demos/stl/EarthElemental.stl

# COPY
# copy Bacteriophage.stl to ../stl/
# copy Flex_Rex.stl to ../stl/
# copy Bacteriophage_s3d.gcode to ../pla/
# copy Flex_Rex_s3d.gcode to ../pla/

# BACKUP
# copy users.yaml to users.yaml.backup

# EXTRACT AND BACKUP
# extract control:salt from config.yaml
# replace config.yaml with ../patch/config.yaml
# place extracted salt in control:salt in new config.yaml
# copy config.yaml to config.yaml.backup







import os
import shutil
import hashlib
import yaml
import sys
import time



def patch():

	try:
		os.remove("/home/pi/.octoprint/uploads/demos/pla/Clip_Bug_Cura.gco")
	except OSError:
		print("no file")
	try:
		os.remove("/home/pi/.octoprint/uploads/demos/pla/EarthElemental_S3d.gcode")
	except OSError:
		print("no file")
	try:
		os.remove("/home/pi/.octoprint/uploads/demos/stl/Clip_Bug.stl")
	except OSError:
		print("no file")
	try:
		os.remove("/home/pi/.octoprint/uploads/demos/stl/EarthElemental.stl")
	except OSError:
		print("no file")


	src_files = os.listdir("/home/pi/.octoprint/slicingProfiles/cura/")
	src = "/home/pi/.octoprint/slicingProfiles/cura/"
	for file_name in src_files:
		full_src_name = os.path.join(src, file_name)
		os.remove(full_src_name)

	shutil.copy("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/Bacteriophage.stl", "/home/pi/.octoprint/uploads/demos/stl/")
	shutil.copy("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/Flex_Rex.stl", "/home/pi/.octoprint/uploads/demos/stl/")
	shutil.copy("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/Bacteriophage_s3d.gcode", "/home/pi/.octoprint/uploads/demos/pla/")
	shutil.copy("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/Flex_Rex_s3d.gcode", "/home/pi/.octoprint/uploads/demos/pla/")

	shutil.copy("/home/pi/.octoprint/users.yaml", "/home/pi/.octoprint/users.yaml.backup")



	originalSalt = ""
	with open("/home/pi/.octoprint/config.yaml") as f:
		doc = yaml.safe_load(f)
		originalSalt = doc['accessControl']['salt']

	shutil.copy("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/config.yaml", "/home/pi/.octoprint/config.yaml")

	with open("/home/pi/.octoprint/config.yaml") as f:
		doc = yaml.safe_load(f)
		doc['accessControl']['salt'] = str(originalSalt)
		with open("/home/pi/.octoprint/config.yaml", 'w') as f:
			yaml.safe_dump(doc, f, default_flow_style=False)

	shutil.copy("/home/pi/.octoprint/config.yaml", "/home/pi/.octoprint/config.yaml.backup")

	os.chmod("/home/pi/.octoprint/config.yaml", 0600)
	os.chmod("/home/pi/.octoprint/config.yaml.backup", 0600)

	try:  #a bunch of code with minor error checking and user alert...ion to copy scripts to the right location; should only ever need to be run once
		os.makedirs('/home/pi/.octoprint/uploads/deleteme')
	except OSError:
		if not os.path.isdir('/home/pi/.octoprint/uploads/deleteme'):
			raise
	else:
		print("deleteme exists")	
	src_files = os.listdir("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/deleteme/")
	src = ("/home/pi/oprint/local/lib/python2.7/site-packages/octoprint_mgsetup/static/patch/deleteme/")
	dest = ("/home/pi/.octoprint/uploads/deleteme")
	for file_name in src_files:
		full_src_name = os.path.join(src, file_name)
		full_dest_name = os.path.join(dest, file_name)
		if not (os.path.isfile(full_dest_name)):
			shutil.copy(full_src_name, dest)
		else:
			if ((hashlib.md5(open(full_src_name).read()).hexdigest()) != (hashlib.md5(open(full_dest_name).read()).hexdigest())):
				shutil.copy(full_src_name, dest)

patch()