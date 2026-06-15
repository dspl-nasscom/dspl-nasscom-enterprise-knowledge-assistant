#!/bin/sh

# Path to the env-config.js file in the public directory (served statically by Next.js)
ENV_CONFIG_FILE="./public/env-config.js"

# Check if public directory exists, if not create it (safe guard)
mkdir -p ./public

# Start the file content
echo "window._env_ = {" > $ENV_CONFIG_FILE

# Read all environment variables starting with NEXT_PUBLIC_
# and write them to the env-config.js file
for var in $(env | grep "^NEXT_PUBLIC_"); do
  key=$(echo "$var" | cut -d '=' -f 1)
  value=$(echo "$var" | cut -d '=' -f 2-)
  echo "  \"$key\": \"$value\"," >> $ENV_CONFIG_FILE
done

# Close the object
echo "};" >> $ENV_CONFIG_FILE

# Start the Next.js application
exec npm start -- -p 8080
