#!/bin/sh
action="$1"
if [ "$action" = "on" ]; then
	uci set adguardhome.config.enabled='1'
	uci commit adguardhome
	[ -x /etc/init.d/adguardhome ] && /etc/init.d/adguardhome start
else
	uci set adguardhome.config.enabled='0'
	uci commit adguardhome
	[ -x /etc/init.d/adguardhome ] && /etc/init.d/adguardhome stop
fi
