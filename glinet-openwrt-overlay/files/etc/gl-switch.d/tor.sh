#!/bin/sh
action="$1"
if [ "$action" = "on" ]; then
	uci set tor.global.enable='1'
	uci commit tor
	[ -x /etc/init.d/tor ] && /etc/init.d/tor start
else
	uci set tor.global.enable='0'
	uci commit tor
	[ -x /etc/init.d/tor ] && /etc/init.d/tor stop
fi
