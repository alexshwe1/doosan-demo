#!/bin/bash

# Check if the .env file exists
if [ ! -f .env ]; then
  echo ".env file not found!"
  exit 1
fi

# Export all variables from the .env file
export $(grep -v '^#' .env | xargs)

# Optional: Confirm that the variables have been set
echo "Environment variables set from .env file."