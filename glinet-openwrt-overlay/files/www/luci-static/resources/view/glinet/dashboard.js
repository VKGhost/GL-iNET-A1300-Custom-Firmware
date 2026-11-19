'use strict';
'require view';
'require ui';
'require glinet_ui as glui';

return view.extend({
	load: function() {
		return glui.getDashboard();
	},

	handleScanRepeater: function(ev) {
		const self = this;
		const scanContainer = document.getElementById('gl-rep-scan-results');
		if (!scanContainer) return;
		scanContainer.innerHTML = '';
		scanContainer.appendChild(E('p', { 'class': 'spinning' }, _('Scanning 2.4GHz and 5GHz Wi-Fi networks...')));

		return glui.scanWifi('auto').then(function(res) {
			const nets = (res && res.networks) ? res.networks : [];
			scanContainer.innerHTML = '';
			if (!nets.length) {
				scanContainer.appendChild(E('p', { 'style': 'color:#b91c1c;padding:8px;' }, _('No wireless networks found in range (ensure Wi-Fi radios are enabled in Wireless & Guest Wi-Fi settings).')));
				return;
			}
			const selectEl = document.getElementById('gl-rep-ssid');
			const encEl = document.getElementById('gl-rep-enc');
			const devEl = document.getElementById('gl-rep-dev');
			const bssidEl = document.getElementById('gl-rep-bssid');

			const rows = nets.slice(0, 30).map(function(n) {
				return E('tr', {}, [
					E('td', { 'style': 'font-weight:600;' }, [ n.ssid ]),
					E('td', {}, [ n.band + ' (Ch ' + n.channel + ')' ]),
					E('td', {}, [ n.signal + ' dBm' ]),
					E('td', {}, [ n.encryption_desc ]),
					E('td', {}, [
						E('button', {
							'class': 'gl-btn gl-btn-secondary',
							'click': function() {
								if (selectEl) selectEl.value = n.ssid;
								if (encEl) encEl.value = n.encryption_uci;
								if (devEl) devEl.value = n.device;
								if (bssidEl) bssidEl.value = n.bssid || '';
							}
						}, _('Select'))
					])
				]);
			});

			scanContainer.appendChild(E('table', { 'class': 'gl-table', 'style': 'margin-bottom:12px;' }, [
				E('thead', {}, [
					E('tr', {}, [
						E('th', {}, _('SSID')),
						E('th', {}, _('Band / Ch')),
						E('th', {}, _('Signal')),
						E('th', {}, _('Security')),
						E('th', {}, _('Action'))
					])
				]),
				E('tbody', {}, rows)
			]));
		}).catch(function(err) {
			scanContainer.innerHTML = '';
			scanContainer.appendChild(E('p', { 'style': 'color:#b91c1c;padding:8px;' }, _('Wi-Fi scan failed: ') + (err.message || err)));
		});
	},

	render: function(data) {
		const self = this;
		const sys = data.system || {};
		const net = data.internet || {};
		const wan = net.wan || {};
		const rep = net.repeater || {};
		const teth = net.tethering || {};
		const modem = net.modem || {};
		const mwan = net.multiwan || {};
		const mac = net.macclone || {};
		const vpn = data.vpn || {};
		const cl = data.clients_summary || {};

		const hrs = Math.floor((sys.uptime || 0) / 3600);
		const mins = Math.floor(((sys.uptime || 0) % 3600) / 60);

		// 1. Top System & Topology Overview Bar
		const overviewGrid = E('div', { 'class': 'gl-grid-3' }, [
			glui.card(_('System & Hardware Status'), glui.badge(sys.model || 'GL-A1300', 'on'), [
				glui.kvList([
					[ _('Firmware Base'), sys.release || 'OpenWrt 25.12.6' ],
					[ _('Uptime / CPU Temp'), hrs + 'h ' + mins + 'm / ' + (sys.temp_c || 42) + ' °C' ],
					[ _('Memory Usage'), (sys.mem_used_pct || 0) + '% used' ],
					[ _('Side Switch Button'), (sys.switch_func || 'wifi').toUpperCase() + ' (' + (sys.switch_state || 'on') + ')' ],
					[ _('Network Mode'), (sys.netmode || 'router').toUpperCase() ]
				])
			]),
			glui.card(_('VPN & Security Summary'), glui.badge(
				(vpn.wg_client_up || vpn.ovpn_client_enabled) ? _('VPN Active') : _('VPN Standby'),
				(vpn.wg_client_up || vpn.ovpn_client_enabled) ? 'on' : 'off'
			), [
				glui.kvList([
					[ _('WireGuard Client'), vpn.wg_client_enabled ? (vpn.wg_client_up ? _('Connected') + ' (' + (vpn.wg_ip || '') + ')' : _('Connecting')) : _('Disabled') ],
					[ _('WireGuard Server'), vpn.wg_server_enabled ? _('Enabled') : _('Disabled') ],
					[ _('OpenVPN Client'), vpn.ovpn_client_enabled ? _('Enabled') : _('Disabled') ],
					[ _('Global Kill Switch'), vpn.kill_switch ? _('Active (Leak Protected)') : _('Off') ],
					[ _('Tailscale / ZeroTier'), (vpn.tailscale_enabled ? 'TS:On ' : 'TS:Off ') + '/ ' + (vpn.zerotier_enabled ? 'ZT:On' : 'ZT:Off') ]
				])
			], [
				E('a', { 'class': 'gl-btn gl-btn-secondary', 'href': L.url('admin/glinet/vpn'), 'style': 'text-decoration:none;' }, _('Manage VPN'))
			]),
			glui.card(_('Clients & Wireless Overview'), glui.badge((cl.lan_count || 0) + (cl.guest_count || 0) + ' ' + _('Online'), 'on'), [
				glui.kvList([
					[ _('5GHz Main Wi-Fi'), (data.wifi && data.wifi.main_5g) ? data.wifi.main_5g.ssid : 'GL-A1300-5G' ],
					[ _('2.4GHz Main Wi-Fi'), (data.wifi && data.wifi.main_2g) ? data.wifi.main_2g.ssid : 'GL-A1300' ],
					[ _('LAN / Main Clients'), String(cl.lan_count || 0) ],
					[ _('Guest Clients'), String(cl.guest_count || 0) ],
					[ _('Blocked MACs'), String(cl.blocked_count || 0) ]
				])
			], [
				E('a', { 'class': 'gl-btn gl-btn-secondary', 'href': L.url('admin/glinet/wireless'), 'style': 'text-decoration:none;' }, _('Wi-Fi Settings')),
				E('a', { 'class': 'gl-btn gl-btn-secondary', 'href': L.url('admin/glinet/clients'), 'style': 'text-decoration:none;' }, _('Client List'))
			])
		]);

		// 2. Ethernet WAN Card
		const wanCard = glui.card(
			_('1. Ethernet (Cable / WAN)'),
			glui.badge(wan.up ? _('Connected') : _('Cable Unplugged / Offline'), wan.up ? 'on' : 'off'),
			[
				glui.kvList([
					[ _('Active IPv4'), wan.ipaddr ? (wan.ipaddr + '/' + (wan.mask || 24)) : '-' ],
					[ _('Gateway'), wan.gateway || '-' ],
					[ _('DNS Servers'), (wan.dns && wan.dns.length) ? wan.dns.join(', ') : '-' ],
					[ _('MAC Address'), wan.macaddr || '-' ]
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Protocol')),
					E('select', { 'id': 'gl-wan-proto' }, [
						E('option', { 'value': 'dhcp', 'selected': wan.uci_proto === 'dhcp' ? 'selected' : null }, _('DHCP (Automatic)')),
						E('option', { 'value': 'pppoe', 'selected': wan.uci_proto === 'pppoe' ? 'selected' : null }, _('PPPoE')),
						E('option', { 'value': 'static', 'selected': wan.uci_proto === 'static' ? 'selected' : null }, _('Static IP'))
					])
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('IP / PPPoE User')),
						E('input', { 'type': 'text', 'id': 'gl-wan-ip-or-user', 'value': wan.ipaddr || '' })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Gateway / PPPoE Password')),
						E('input', { 'type': 'password', 'id': 'gl-wan-gw-or-pass', 'value': wan.gateway || '' })
					])
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('MTU Size')),
						E('input', { 'type': 'number', 'id': 'gl-wan-mtu', 'value': '1500', 'placeholder': '1500' })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('VLAN ID (Optional)')),
						E('input', { 'type': 'number', 'id': 'gl-wan-vlan', 'placeholder': 'e.g. 10' })
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const proto = document.getElementById('gl-wan-proto').value;
						const f1 = document.getElementById('gl-wan-ip-or-user').value;
						const f2 = document.getElementById('gl-wan-gw-or-pass').value;
						const mtu = document.getElementById('gl-wan-mtu').value;
						const vlan = document.getElementById('gl-wan-vlan').value;
						return glui.setWan(
							proto,
							proto === 'static' ? f1 : '',
							'255.255.255.0',
							proto === 'static' ? f2 : '',
							'',
							proto === 'pppoe' ? f1 : '',
							proto === 'pppoe' ? f2 : '',
							mtu,
							vlan
						).then(function() {
							glui.notifySaved(_('Ethernet WAN settings applied.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to apply WAN settings: ') + (err.message || err));
						});
					})
				}, _('Apply Ethernet Settings'))
			]
		);

		// 3. Repeater (WISP / WWAN) Card
		const knownRows = (rep.known_networks || []).map(function(kn) {
			return E('tr', {}, [
				E('td', { 'style': 'font-weight:600;' }, [ kn.ssid ]),
				E('td', {}, [ kn.encryption ]),
				E('td', {}, [
					E('button', {
						'class': 'gl-btn gl-btn-danger',
						'style': 'padding:4px 8px;font-size:12px;',
						'click': ui.createHandlerFn(self, function() {
							return glui.manageRepeater('delete_saved', kn.id, true, 'auto', 60).then(function() {
								location.reload();
							}).catch(function(err) {
								glui.notifyError(_('Failed to remove network: ') + (err.message || err));
							});
						})
					}, _('Remove'))
				])
			]);
		});

		const repeaterCard = glui.card(
			_('2. Repeater (Wi-Fi WISP / STA Manager)'),
			glui.badge(rep.up ? (_('Connected: ') + (rep.ssid || '')) : (rep.enable ? _('Searching / Standby') : _('Disabled')), rep.up ? 'on' : (rep.enable ? 'warn' : 'off')),
			[
				glui.kvList([
					[ _('Connected SSID'), rep.ssid || '-' ],
					[ _('Repeater IPv4'), rep.ipaddr || '-' ],
					[ _('Gateway'), rep.gateway || '-' ],
					[ _('Auto Reconnect'), rep.auto ? _('Enabled') : _('Disabled') ]
				]),
				E('div', { 'id': 'gl-rep-scan-results' }),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Target Wi-Fi SSID')),
						E('input', { 'type': 'text', 'id': 'gl-rep-ssid', 'value': rep.ssid || '', 'placeholder': _('Scan or type SSID') })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Security')),
						E('select', { 'id': 'gl-rep-enc' }, [
							E('option', { 'value': 'psk2', 'selected': rep.encryption === 'psk2' ? 'selected' : null }, 'WPA2-PSK'),
							E('option', { 'value': 'sae', 'selected': rep.encryption === 'sae' ? 'selected' : null }, 'WPA3-SAE'),
							E('option', { 'value': 'psk-mixed', 'selected': rep.encryption === 'psk-mixed' ? 'selected' : null }, 'WPA/WPA2-Mixed'),
							E('option', { 'value': 'none', 'selected': rep.encryption === 'none' ? 'selected' : null }, _('Open / No Password'))
						])
					])
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Wi-Fi Password')),
						E('input', { 'type': 'password', 'id': 'gl-rep-key', 'placeholder': _('Enter upstream Wi-Fi password') })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Radio / Band')),
						E('select', { 'id': 'gl-rep-dev' }, [
							E('option', { 'value': 'radio0' }, 'radio0 (2.4GHz)'),
							E('option', { 'value': 'radio1' }, 'radio1 (5GHz)')
						])
					])
				]),
				E('input', { 'type': 'hidden', 'id': 'gl-rep-bssid', 'value': rep.bssid || '' }),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-rep-lock-bssid', 'checked': rep.bssid ? 'checked' : null }),
					_('Lock to specific BSSID (Prevent roaming to weaker AP)')
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-rep-auto', 'checked': rep.auto ? 'checked' : null }),
					_('Auto Scan & Reconnect to Known Networks')
				]),
				knownRows.length ? E('div', { 'style': 'margin-top:8px;' }, [
					E('strong', { 'style': 'font-size:12.5px;color:#475569;' }, _('Known Networks:')),
					E('table', { 'class': 'gl-table', 'style': 'margin-top:4px;' }, [ E('tbody', {}, knownRows) ])
				]) : E('span')
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-secondary',
					'click': ui.createHandlerFn(this, function(ev) {
						return self.handleScanRepeater(ev);
					})
				}, _('Scan Wi-Fi')),
				rep.enable ? E('button', {
					'class': 'gl-btn gl-btn-danger',
					'click': ui.createHandlerFn(this, function() {
						return glui.manageRepeater('disconnect', '', false, 'auto', 60).then(function() {
							glui.notifySaved(_('Repeater disconnected.'));
							location.reload();
						}).catch(function(err) {
							glui.notifyError(_('Failed to disconnect: ') + (err.message || err));
						});
					})
				}, _('Disconnect')) : E('span'),
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const ssid = document.getElementById('gl-rep-ssid').value;
						const enc = document.getElementById('gl-rep-enc').value;
						const key = document.getElementById('gl-rep-key').value;
						const dev = document.getElementById('gl-rep-dev').value;
						const bssid = document.getElementById('gl-rep-bssid').value;
						const lockBssid = document.getElementById('gl-rep-lock-bssid').checked;
						if (!ssid) {
							glui.notifyError(_('Please enter or select a Wi-Fi SSID to connect.'));
							return;
						}
						return glui.connectRepeater(ssid, key, enc, bssid, dev, lockBssid, true, 'dhcp', '', '', '').then(function() {
							glui.notifySaved(_('Connecting Repeater to ') + ssid + '...');
						}).catch(function(err) {
							glui.notifyError(_('Failed to connect repeater: ') + (err.message || err));
						});
					})
				}, _('Connect & Save'))
			]
		);

		// 4. Tethering & 3G/4G Cellular Modem Card
		const tethModemCard = glui.card(
			_('3. Cellular Modem & USB Tethering'),
			glui.badge(teth.up ? _('Tethering Active') : (modem.up ? _('Modem 4G Active') : _('Standby')), (teth.up || modem.up) ? 'on' : 'off'),
			[
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-teth-en', 'checked': teth.enable ? 'checked' : null }),
					_('Enable USB Phone Tethering (iOS USB / Android RNDIS usb0)')
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-usb-pwr', 'checked': teth.usb_power ? 'checked' : null }),
					_('Supply 5V Power to USB Port (Power cycle GPIO 4)')
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-modem-en', 'checked': modem.enable ? 'checked' : null }),
					_('Enable 3G/4G USB Cellular Modem (wwan0 / QMI / NCM)')
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Cellular APN')),
						E('input', { 'type': 'text', 'id': 'gl-modem-apn', 'value': modem.apn || 'internet' })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('SIM PIN (Optional)')),
						E('input', { 'type': 'text', 'id': 'gl-modem-pin', 'value': modem.pincode || '' })
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const tEn = document.getElementById('gl-teth-en').checked;
						const uPwr = document.getElementById('gl-usb-pwr').checked;
						const mEn = document.getElementById('gl-modem-en').checked;
						const apn = document.getElementById('gl-modem-apn').value;
						const pin = document.getElementById('gl-modem-pin').value;
						return glui.setTetheringModem(tEn, 'usb0', uPwr, mEn, apn, pin, '1', '/dev/ttyUSB2', '').then(function() {
							glui.notifySaved(_('Tethering & Cellular Modem settings applied.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to apply settings: ') + (err.message || err));
						});
					})
				}, _('Apply USB / Modem Settings'))
			]
		);

		// 5. Multi-WAN & MAC Clone Card
		const mwanCard = glui.card(
			_('4. Multi-WAN Failover & MAC Clone'),
			glui.badge(mwan.enabled ? (_('Multi-WAN: ') + (mwan.mode || 'failover').toUpperCase()) : _('Single WAN'), mwan.enabled ? 'on' : 'off'),
			[
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-mwan-en', 'checked': mwan.enabled ? 'checked' : null }),
					_('Enable Multi-WAN Health Check & Automatic Failover (kmwan)')
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Multi-WAN Mode')),
						E('select', { 'id': 'gl-mwan-mode' }, [
							E('option', { 'value': 'failover', 'selected': mwan.mode === 'failover' ? 'selected' : null }, _('Failover (Priority Order)')),
							E('option', { 'value': 'balance', 'selected': mwan.mode === 'balance' ? 'selected' : null }, _('Load Balance'))
						])
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Ethernet / Repeater / USB Metric')),
						E('input', { 'type': 'text', 'id': 'gl-mwan-metrics', 'value': '10,20,30,40', 'title': 'wan,wwan,tethering,modem metrics' })
					])
				]),
				E('hr', { 'style': 'border:none;border-top:1px solid #f1f5f9;margin:10px 0;' }),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('MAC Clone Mode')),
						E('select', { 'id': 'gl-mac-mode' }, [
							E('option', { 'value': '0', 'selected': mac.mode === '0' ? 'selected' : null }, _('Factory Default MAC (') + (mac.factory_mac || '') + ')'),
							E('option', { 'value': '2', 'selected': mac.mode === '2' ? 'selected' : null }, _('Randomize MAC (Captive Portal / Public Wi-Fi)')),
							E('option', { 'value': '3', 'selected': mac.mode === '3' ? 'selected' : null }, _('Custom / Cloned MAC Address'))
						])
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Custom / Active MAC')),
						E('input', { 'type': 'text', 'id': 'gl-mac-addr', 'value': mac.mac || '', 'placeholder': '94:83:C4:XX:XX:XX' })
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const mEn = document.getElementById('gl-mwan-en').checked;
						const mMode = document.getElementById('gl-mwan-mode').value;
						const mParts = (document.getElementById('gl-mwan-metrics').value || '10,20,30,40').split(',');
						const macMode = document.getElementById('gl-mac-mode').value;
						const macAddr = document.getElementById('gl-mac-addr').value;
						return glui.setMultiwanMacclone(
							mEn, mMode, 5,
							parseInt(mParts[0] || 10, 10),
							parseInt(mParts[1] || 20, 10),
							parseInt(mParts[2] || 30, 10),
							parseInt(mParts[3] || 40, 10),
							'1.1.1.1', '8.8.8.8',
							macMode, macAddr
						).then(function() {
							glui.notifySaved(_('Multi-WAN & MAC Clone settings applied.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to apply Multi-WAN: ') + (err.message || err));
						});
					})
				}, _('Apply Multi-WAN & MAC'))
			]
		);

		return E('div', { 'class': 'gl-wrap' }, [
			glui.renderHeader('dashboard', _('Manage Ethernet WAN, Repeater (WISP), USB Tethering, 3G/4G Modem, Multi-WAN Failover, and MAC Clone')),
			overviewGrid,
			E('div', { 'class': 'gl-grid' }, [ wanCard, repeaterCard, tethModemCard, mwanCard ])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
