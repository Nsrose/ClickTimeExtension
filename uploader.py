# Script that should be run before uploading to Chrome store.
import os
import zipfile
import sys
from shutil import copyfile, move

# All files with API_BASE links defined.
API_LINKED_FILES = {"js/app/app.js", "js/app/content.js"}

# Live API base url
LIVE_API_URL = '"https://app.clicktime.com/api/1.3/"'


def create_chrome_ext(new_version):
    '''Makes a zipped folder of the chrome extension, ready for upload.'''
    update_api_links()
    update_manifest_version(new_version)
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
            if "API_BASE" in line:
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


def update_manifest_version(new_version):
    '''Updates the manifest version of the extension in manifest.json'''
    read_file = open('manifest.json', 'r')
    lines = read_file.readlines()
    read_file.close()
    for i in range(len(lines)):
        line = lines[i]
        if ("version" in line) and ("manifest_version" not in line):
            splitline = line.split(":")
            splitline[1] = '"' + new_version + '",\n'
            joinedline = ('').join(splitline)
            lines[1] = joinedline
    joinedlines = ('').join(lines)
    write_file = open("manifest.json-new", 'w')
    write_file.write(joinedlines)
    write_file.close()

    move("manifest.json-new", "manifest.json");


if __name__ == "__main__":
    if len(sys.argv != 2):
        print("You must specificy the new version number as an argument.")
        sys.exit(1)
    create_chrome_ext(sys.argv[1])