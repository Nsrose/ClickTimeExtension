# Script that should be run before uploading to Chrome store.
import os
import zipfile
import sys
import stat
import errno
from shutil import copyfile, move, copytree, rmtree


# Live API base url
LIVE_API_URL = '"https://app.clicktime.com/api/1.3/"'

# Name of folder to create uploadable chrome extension in
# DO NOT Name this the same as the root project folder!!
EXT_FOLDER_NAME = "chrome-ext"

# All files with API_BASE links defined.
API_LINKED_FILES = {EXT_FOLDER_NAME + "/js/app/app.js",  EXT_FOLDER_NAME + "/js/app/content.js"}


def create_chrome_ext():
    '''Makes a zipped folder of the chrome extension, ready for upload.'''

    copytree("../ClickTimeExtension", EXT_FOLDER_NAME);

    update_api_links()

    remove_git(EXT_FOLDER_NAME)
    zipped = zipfile.ZipFile(EXT_FOLDER_NAME + ".zip", "w");
    for dirname, subdirs, files in os.walk(EXT_FOLDER_NAME):
        zipped.write(dirname)
        for filename in files:
            zipped.write(os.path.join(dirname, filename))
    zipped.close()

    rmtree(EXT_FOLDER_NAME)


def update_api_links():
    '''Updates the API links within files to point to the live site.'''
    for filename in API_LINKED_FILES:
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

def remove_git(ext_folder):
    def handleRemoveReadonly(func, path, exc):
        excvalue = exc[1]
        if func in (os.rmdir, os.remove) and excvalue.errno == errno.EACCES:
            os.chmod(path, stat.S_IRWXU| stat.S_IRWXG| stat.S_IRWXO) # 0777
            func(path)
        else:
            raise

    rmtree(ext_folder + "/.git", ignore_errors=False, onerror=handleRemoveReadonly)


if __name__ == "__main__":
    create_chrome_ext()