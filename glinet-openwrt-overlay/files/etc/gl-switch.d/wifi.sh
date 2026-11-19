#!/bin/sh
action="$1"
disabled="1"
[ "$action" = "on" ] && disabled="0"
for dev in $(uci show wireless | sed -n "s/^wireless\.\([^.=]*\)=wifi-device$/\1/p"); do
	uci set wireless.${dev}.disabled="$disabled"
done
uci commit wireless
wifi reload
