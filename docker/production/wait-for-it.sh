#!/bin/bash
# wait-for-it.sh - Wait for service to be available

set -e

host="$1"
port="$2"
shift 2
cmd="$@"

until nc -z "$host" "$port"; do
  >&2 echo "Waiting for $host:$port to be available..."
  sleep 2
done

>&2 echo "$host:$port is available - executing command"
exec $cmd