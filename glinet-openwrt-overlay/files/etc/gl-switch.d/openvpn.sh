#!/bin/sh
action="$1"
if [ "$action" = "on" ]; then
	uci set ovpnclient.global.enable='1'
	uci set openvpn.ovpnclient.enabled='1' 2>/dev/null
	uci commit ovpnclient
	uci commit openvpn 2>/dev/null
	[ -x /etc/init.d/openvpn ] && /etc/init.d/openvpn restart
else
	uci set ovpnclient.global.enable='0'
	uci set openvpn.ovpnclient.enabled='0' 2>/dev/null
	uci commit ovpnclient
	uci commit openvpn 2>/dev/null
	[ -x /etc/init.d/openvpn ] && /etc/init.d/openvpn stop
fi
[ -x /etc/init.d/gl-vpnpolicy ] && /etc/init.d/gl-vpnpolicy reload
