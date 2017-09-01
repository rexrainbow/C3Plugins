import os
import os.path as op

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


def output(f2plugins):
    myPath = op.dirname(op.realpath(__file__))
    mdF = open(op.join(myPath, "index.md"), "w")    
    mdF.write("# References  \n")
    for (src, plugins) in f2plugins:
        mdF.write("- {src}  \n".format(src=src))
        for p in plugins:
            p = p.replace(rootDir, "").split("\\")           
            mdF.write("  - {plugin}: {name}  \n".format(plugin=p[1], name=p[2]))

    mdF.close()

def main():
    f2plugins = []
    for (dirpath, dirnames, filenames) in os.walk(srcDir):
        for f in filenames:
            if op.splitext(f)[1] != ".js":
                continue

            paths = getPaths( f )
            f2plugins.append([f, paths])

    output(f2plugins)

main()
