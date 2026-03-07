#!/bin/bash
# keep-warm.sh — Cron job script to prevent Passenger cold starts
# Deploy this concept using cPanel Cron Jobs:
#   Schedule: */10 * * * *  (every 10 minutes)
#   Command:  curl -s https://eastafricanip.com/api/health > /dev/null
#
# To add via cPanel: Cron Jobs → Custom Interval → paste the command above
curl -s https://eastafricanip.com/api/health > /dev/null
