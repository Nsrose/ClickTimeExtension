# Script that should be run before uploading to Chrome store.
import os
import zipfile
import sys
from shutil import copyfile, move

# All files with API_BASE links defined.
API_LINKED_FILES = {"js/app/app.js", "js/app/content.js"}

# Live API base url
LIVE_API_URL = '"https://app.clicktime.com/api/1.3/"'


def create_chrome_ext():
    '''Makes a zipped folder of the chrome extension, ready for upload.'''
    update_api_links()
    zipped = zipfile.ZipFile("../chrome_ext.zip", "w");
    for dirname, subdirs, files in os.walk("../ClickTimeExtension"):
        zipped.write(dirname)
        for filename in files:
            zipped.write(os.path.join(dirname, filename))
    zipped.close()
    reset_dev_links()


def update_api_links():
    '''Updates the API links within files to point to the live site.'''
    for filename in API_LINKED_FILES:
        name = filename.split('/')[-1]
        copyfile(filename, "../" + name + "-backup")
        read_file = open(filename, 'r')
        lines = read_file.readlines()
        read_file.close()
        for i in range(len(lines)):
            line = lines[i]
            if "API_BASE" in line and ("session" not in line):
                splitline = line.split('"')
                splitline[1] = LIVE_API_URL
                joinedline = ('').join(splitline)
                lines[i] = joinedline
        joinedlines = ('').join(lines)
        write_file = open(filename + "-new", 'w')
        write_file.write(joinedlines)
        write_file.close()

        move(filename + "-new", filename)

def reset_dev_links():
    '''Reset dev links to devXX instead of live.'''
    for filename in API_LINKED_FILES:
        name = filename.split('/')[-1]
        move("../" + name + "-backup", filename)


if __name__ == "__main__":
    create_chrome_ext()