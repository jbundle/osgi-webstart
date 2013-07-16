#!/usr/bin/env bash

set -e

# Base directory for this entire project
BASEDIR=$(cd $(dirname $0) && pwd)

# Source directory for unbuilt code
SRCDIR="$BASEDIR"

# Directory containing dojo build utilities
TOOLSDIR="$SRCDIR/util/buildscripts"

# Destination directory for built code
DISTDIR="$BASEDIR/../js"

# Main application package build configuration
PROFILE="$BASEDIR/jbundle/jbundle.profile.js"

# Main application package build configuration
DOJO="dojo-release-1.9.1-src"
DOJO_SRC="/home/don/Downloads/$DOJO.tar.gz"

# Configuration over. Main application start up!

if [ ! -d "$SRCDIR/dojo" ]; then
	tar zxvf $DOJO_SRC
	mv $SRCDIR/$DOJO/* .
fi

if [ ! -d "$TOOLSDIR" ]; then
	echo "Can't find Dojo build tools -- did you initialise submodules? (git submodule update --init --recursive)"
	exit 1
fi

echo "Building application with $PROFILE to $DISTDIR."

echo -n "Cleaning old files..."
# rm -fr jbundle
# cp -r "$DISTDIR"/jbundle jbundle
rm -rf "$DISTDIR"
echo " Done"

./util/buildscripts/build.sh --profile jbundle/jbundle.profile.js

# Cleanup

rm -fr $DISTDIR/dojo
rm -fr $DISTDIR/dojox
rm -fr $DISTDIR/dijit
rm -fr $DISTDIR/util
rm -fr $SRCDIR/dojo
rm -fr $SRCDIR/dojox
rm -fr $SRCDIR/dijit
rm -fr $SRCDIR/util
