#!/bin/bash

set -eu

files=(
    "index.html"
    "undo.svg"
    "download.svg"
    "edit.svg"
)

included_files=(
    "bikecounter.js"
    "bikecounter.css"
)

for x in "${files[@]}" "${included_files[@]}"; do
    dn="dist/$(dirname "$x")"
    bn="$(basename "$x")"
    mkdir -p "$dn"
    cp -v "$x" "$dn/$bn"
done

for x in "${included_files[@]}"; do
    md5=$(md5sum "dist/$x" | sed 's/ .*//')
    new_name=$(echo "$x" | sed 's/\./'"-$md5"'./')
    mv "dist/$x" "dist/$new_name"
    re_filename=$(echo "$x" | sed 's/\./\\./g')
    sed -i s/\""$re_filename"\"/\""$new_name"\"/g dist/index.html
done
