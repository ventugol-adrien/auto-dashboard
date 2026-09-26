#!/usr/bin/env bash

set -u

output_path=${1:-data/resource-usage.jsonl}
interval=${INTERVAL_SECONDS:-1}

mkdir -p "$(dirname "$output_path")"

previous_total=0
previous_idle=0

while :; do
    read -r _ user nice system idle iowait irq softirq steal _ < /proc/stat
    total=$((user + nice + system + idle + iowait + irq + softirq + steal))
    idle_total=$((idle + iowait))

    if (( previous_total > 0 && total > previous_total )); then
        cpu_percent=$(awk -v idle="$((idle_total - previous_idle))" -v total="$((total - previous_total))" 'BEGIN { printf "%.2f", 100 * (1 - idle / total) }')
    else
        cpu_percent="0.00"
    fi

    previous_total=$total
    previous_idle=$idle_total

    memory_total_kb=$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)
    memory_available_kb=$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo)
    memory_used_kb=$((memory_total_kb - memory_available_kb))
    memory_percent=$(awk -v used="$memory_used_kb" -v total="$memory_total_kb" 'BEGIN { printf "%.2f", 100 * used / total }')
    memory_used_gb=$(awk -v value="$memory_used_kb" 'BEGIN { printf "%.2f", value / 1024 / 1024 }')
    memory_total_gb=$(awk -v value="$memory_total_kb" 'BEGIN { printf "%.2f", value / 1024 / 1024 }')
    load_1m=$(awk '{ print $1 }' /proc/loadavg)
    uptime_seconds=$(awk '{ print $1 }' /proc/uptime)
    uptime_hours=$(awk -v value="$uptime_seconds" 'BEGIN { printf "%.2f", value / 3600 }')
    timestamp=$(date +%s)

    printf '{"timestamp":%s,"cpu_percent":%s,"memory_percent":%s,"memory_used_gb":%s,"memory_total_gb":%s,"load_1m":%s,"uptime_hours":%s}\n' \
        "$timestamp" "$cpu_percent" "$memory_percent" "$memory_used_gb" "$memory_total_gb" "$load_1m" "$uptime_hours" >> "$output_path"

    sleep "$interval"
done
