# This script will create a zipped chrome extension to upload that will display a screen
# notifying the user that the beta program for the Clicktime Extension has ended. That's it.
import os
import zipfile

# Run this script and upload chrome-ext-destruct.zip in place of the chrome extension on
# the chrome developer dashboard


def create_destruct_ext():
	zipped = zipfile.ZipFile("chrome-ext-destruct.zip", "w")
	for dirname, subdirs, files in os.walk("destruct"):
		zipped.write(dirname)
		for filename in files:
			zipped.write(os.path.join(dirname, filename))
	zipped.close()

create_destruct_ext()