import sys, os
import os.path as op
from shutil import copyfile

rootDir = r"D:\Construct 3\my_data\C3Plugins"
srcDir = r"D:\Construct 3\my_data\C3Plugins\utility"
def getPaths(targetFileName):
    p = []
    for (dirpath, dirnames, filenames) in os.walk(rootDir):
        if dirpath == srcDir:
            continue

        if targetFileName in filenames:
            p.append(op.join(dirpath, targetFileName))

    return p

def main():
    for arg in sys.argv[1:]:
        paths = getPaths( os.path.split(arg)[1] )
        for p in paths:
            print "copy {src} to {dist}".format(src=arg, dist = p)
            copyfile(arg, p)



# -----------------------------------------------------------------------------  
try:
    main()
except Exception, e: 
    print e

raw_input()