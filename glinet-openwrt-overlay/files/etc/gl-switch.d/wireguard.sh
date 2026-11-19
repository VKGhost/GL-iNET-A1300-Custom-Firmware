#!/bin/sh
action="$1"
if [ "$action" = "on" ]; then
	active_prof=$(uci -q get wireguard.global.active_profile)
	if [ -n "$active_prof" ]; then
		ubus call glinet save_vpn "{\"section_type\":\"wg_client\",\"data\":{\"enable\":true,\"active_profile\":\"$active_prof\"}}" >/dev/null 2>&1 && exit 0
	fi
	uci set wireguard.global.enabled='1'
	[ -n "$(uci -q get network.wgclient)" ] && {
		uci set network.wgclient.disabled='0'
		uci commit network
		ifup wgclient
	}
else
	ubus call glinet save_vpn "{\"section_type\":\"wg_client\",\"data\":{\"enable\":false}}" >/dev/null 2>&1 && exit 0
	uci set wireguard.global.enabled='0'
	[ -n "$(uci -q get network.wgclient)" ] && {
		ifdown wgclient
		uci set network.wgclient.disabled='1'
		uci commit network
	}
fi
uci commit wireguard
[ -x /etc/init.d/gl-vpnpolicy ] && /etc/init.d/gl-vpnpolicy reload
