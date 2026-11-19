'use strict';
'require baseclass';
'require rpc';
'require ui';

const CSS_TEXT = `
.gl-wrap { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; max-width: 1220px; margin: 0 auto; padding-bottom: 32px; }
.gl-banner { background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0d9488 100%); color: #fff; border-radius: 12px; padding: 18px 24px; margin-bottom: 18px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 4px 14px rgba(15,23,42,0.14); }
.gl-banner-title { font-size: 20px; font-weight: 700; letter-spacing: 0.2px; display: flex; align-items: center; gap: 10px; }
.gl-banner-sub { font-size: 13px; color: #cbd5e1; margin-top: 3px; }
.gl-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
.gl-nav-item { padding: 8px 15px; border-radius: 8px; font-size: 13.5px; font-weight: 600; text-decoration: none !important; color: #475569; background: #f1f5f9; transition: all 0.15s ease; }
.gl-nav-item:hover { background: #e2e8f0; color: #0f172a; }
.gl-nav-item.active { background: #0d9488; color: #fff !important; box-shadow: 0 2px 6px rgba(13,148,136,0.28); }
.gl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 18px; margin-bottom: 18px; }
.gl-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 18px; }
.gl-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; flex-direction: column; justify-content: space-between; }
.gl-card-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 14px; }
.gl-card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
.gl-card-footer { border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.gl-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.gl-badge.on { background: #d1fae5; color: #065f46; }
.gl-badge.off { background: #f1f5f9; color: #64748b; }
.gl-badge.warn { background: #fef3c7; color: #92400e; }
.gl-badge.danger { background: #fee2e2; color: #991b1b; }
.gl-kv-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; font-size: 13.5px; }
.gl-kv-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed #f1f5f9; }
.gl-kv-key { color: #64748b; font-weight: 500; }
.gl-kv-val { color: #0f172a; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.gl-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.gl-field label { font-size: 13px; font-weight: 600; color: #334155; }
.gl-field small { font-size: 11.5px; color: #64748b; }
.gl-field input[type="text"], .gl-field input[type="password"], .gl-field input[type="number"], .gl-field select, .gl-field textarea {
	width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff; color: #0f172a;
}
.gl-check { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13.5px; font-weight: 600; color: #1e293b; cursor: pointer; }
.gl-btn { padding: 7px 14px; border-radius: 7px; font-size: 13px; font-weight: 600; border: 1px solid transparent; cursor: pointer; transition: all 0.15s; }
.gl-btn-primary { background: #0d9488; color: #fff; }
.gl-btn-primary:hover { background: #0f766e; }
.gl-btn-secondary { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
.gl-btn-secondary:hover { background: #e2e8f0; }
.gl-btn-danger { background: #ef4444; color: #fff; }
.gl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.gl-table th { text-align: left; padding: 8px 10px; background: #f8fafc; color: #475569; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
.gl-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
`;

return baseclass.extend({
	getDashboard: rpc.declare({ object: 'glinet', method: 'get_dashboard', expect: {} }),
	setWan: rpc.declare({
		object: 'glinet',
		method: 'set_wan',
		params: [ 'proto', 'ipaddr', 'netmask', 'gateway', 'dns', 'username', 'password', 'mtu', 'vlan' ],
		reject: true
	}),
	callIwinfoScan: rpc.declare({
		object: 'iwinfo',
		method: 'scan',
		params: [ 'device' ],
		nobatch: true,
		expect: { results: [] }
	}),

	scanWifi: function(band) {
		const self = this;
		function extractCells(res) {
			if (Array.isArray(res)) return res;
			if (res && Array.isArray(res.results)) return res.results;
			return [];
		}

		function scanDevice(dev, radName) {
			return self.callIwinfoScan(dev).then(function(res) {
				const list = extractCells(res);
				return list.map(function(c) {
					c._radio = radName;
					return c;
				});
			}).catch(function() { return []; });
		}

		function scanWithFallback(primary, fallback) {
			return scanDevice(primary, primary).then(function(cells) {
				if (cells && cells.length > 0) return cells;
				return scanDevice(fallback, primary);
			});
		}

		const tasks = [];
		if (band === '5g') {
			tasks.push(scanWithFallback('radio1', 'wlan1'));
		} else if (band === '2g') {
			tasks.push(scanWithFallback('radio0', 'wlan0'));
		} else {
			tasks.push(scanWithFallback('radio1', 'wlan1'));
			tasks.push(scanWithFallback('radio0', 'wlan0'));
		}

		return Promise.all(tasks).then(function(resultsArray) {
			const allCells = [].concat.apply([], resultsArray);
			const seen = {};
			const networks = [];

			allCells.forEach(function(cell) {
				if (!cell.ssid || cell.ssid.trim() === '') return;
				const key = cell.ssid + '|' + (cell.bssid || '');
				if (seen[key]) return;
				seen[key] = true;

				const enc = cell.encryption || {};
				let enc_uci = 'none';
				let enc_desc = 'Open';
				if (enc.enabled || (enc.wpa && enc.wpa.length) || (enc.authentication && enc.authentication.length)) {
					const auth = (enc.authentication || []).join(' ');
					const wpa = enc.wpa || [];
					if (auth.indexOf('sae') >= 0 || auth.indexOf('WPA3') >= 0 || wpa.indexOf(3) >= 0) {
						enc_uci = 'sae';
						enc_desc = 'WPA3-SAE';
					} else if (auth.indexOf('psk') >= 0 || auth.indexOf('WPA2') >= 0 || wpa.indexOf(2) >= 0) {
						enc_uci = 'psk2';
						enc_desc = 'WPA2-PSK';
					} else {
						enc_uci = 'psk-mixed';
						enc_desc = 'WPA/WPA2-Mixed';
					}
				}

				const ch = cell.channel || 0;
				const b_name = (ch > 14 || cell._radio === 'radio1') ? '5GHz' : '2.4GHz';
				const sig = cell.signal || cell.dbm || -80;

				networks.push({
					ssid: cell.ssid,
					bssid: cell.bssid || '',
					channel: ch,
					band: b_name,
					signal: sig,
					encryption: enc_uci,
					encryption_desc: enc_desc,
					device: (b_name === '5GHz') ? 'radio1' : 'radio0'
				});
			});

			networks.sort(function(a, b) { return b.signal - a.signal; });
			return { networks: networks };
		});
	},
	connectRepeater: rpc.declare({
		object: 'glinet',
		method: 'connect_repeater',
		params: [ 'ssid', 'key', 'encryption', 'bssid', 'device', 'lock_bssid', 'remember', 'proto', 'ipaddr', 'netmask', 'gateway' ],
		reject: true
	}),
	manageRepeater: rpc.declare({
		object: 'glinet',
		method: 'manage_repeater',
		params: [ 'action', 'section', 'auto', 'band', 'scan_interval' ],
		reject: true
	}),
	setTetheringModem: rpc.declare({
		object: 'glinet',
		method: 'set_tethering_modem',
		params: [ 'tethering_enabled', 'tethering_device', 'usb_power', 'modem_enable', 'apn', 'pincode', 'sim_num', 'modem_device', 'at_cmd' ],
		reject: true
	}),
	setMultiwanMacclone: rpc.declare({
		object: 'glinet',
		method: 'set_multiwan_macclone',
		params: [ 'mwan_enable', 'mwan_mode', 'mwan_interval', 'wan_metric', 'wwan_metric', 'tethering_metric', 'modem_metric', 'track_ip1', 'track_ip2', 'mac_mode', 'mac_addr' ],
		reject: true
	}),
	getWifiConfig: rpc.declare({ object: 'glinet', method: 'get_wifi_config', expect: {} }),
	setWifiConfig: rpc.declare({
		object: 'glinet',
		method: 'set_wifi_config',
		params: [ 'ifaces', 'guest_ip', 'guest_lan_access', 'schedule_enable', 'schedule_off', 'schedule_on' ],
		reject: true
	}),
	getVpnDetails: rpc.declare({ object: 'glinet', method: 'get_vpn_details', expect: {} }),
	saveVpn: rpc.declare({ object: 'glinet', method: 'save_vpn', params: [ 'section_type', 'data' ], reject: true }),
	getClientsQos: rpc.declare({ object: 'glinet', method: 'get_clients_qos', expect: {} }),
	saveClientsQos: rpc.declare({
		object: 'glinet',
		method: 'save_clients_qos',
		params: [ 'action', 'mac', 'blocked', 'upload_limit', 'download_limit', 'hostname', 'data' ],
		reject: true
	}),
	getNetworkDns: rpc.declare({ object: 'glinet', method: 'get_network_dns', expect: {} }),
	saveNetworkDns: rpc.declare({ object: 'glinet', method: 'save_network_dns', params: [ 'section_type', 'data' ], reject: true }),
	getSystemHardware: rpc.declare({ object: 'glinet', method: 'get_system_hardware', expect: {} }),
	saveSystemHardware: rpc.declare({ object: 'glinet', method: 'save_system_hardware', params: [ 'section_type', 'data' ], reject: true }),

	injectStyle: function() {
		if (document.getElementById('glinet-custom-css')) return;
		const style = E('style', { id: 'glinet-custom-css', type: 'text/css' }, [ CSS_TEXT ]);
		document.head.appendChild(style);
	},

	renderHeader: function(activeTab, subtitle) {
		this.injectStyle();
		const tabs = [
			{ id: 'dashboard', title: _('Internet & Repeater'), path: 'admin/glinet/dashboard' },
			{ id: 'wireless', title: _('Wireless & Guest Wi-Fi'), path: 'admin/glinet/wireless' },
			{ id: 'vpn', title: _('VPN & Policy Routing'), path: 'admin/glinet/vpn' },
			{ id: 'clients', title: _('Clients, QoS & Security'), path: 'admin/glinet/clients' },
			{ id: 'network', title: _('LAN, DNS & IPv6'), path: 'admin/glinet/network' },
			{ id: 'system', title: _('Hardware, NAS & Cloud'), path: 'admin/glinet/system' }
		];

		return E('div', {}, [
			E('div', { 'class': 'gl-banner' }, [
				E('div', {}, [
					E('div', { 'class': 'gl-banner-title' }, [ 'GL.iNet Control Center — GL-A1300 (OpenWrt 25.12)' ]),
					E('div', { 'class': 'gl-banner-sub' }, [ subtitle || _('Stock GL.iNet 4.x Workflow & Backend Suite powered by Native OpenWrt 25.12 DSA + fw4 + rpcd') ])
				]),
				E('div', { 'style': 'display:flex;gap:8px;align-items:center;' }, [
					E('a', { 'class': 'gl-btn gl-btn-secondary', 'href': L.url('admin/status/overview'), 'style': 'text-decoration:none;' }, _('Standard LuCI Overview'))
				])
			]),
			E('div', { 'class': 'gl-nav' }, tabs.map(function(t) {
				return E('a', {
					'class': 'gl-nav-item' + (t.id === activeTab ? ' active' : ''),
					'href': L.url(t.path)
				}, [ t.title ]);
			}))
		]);
	},

	badge: function(label, state) {
		return E('span', { 'class': 'gl-badge ' + (state || 'off') }, [ label ]);
	},

	kvList: function(pairs) {
		return E('div', { 'class': 'gl-kv-list' }, pairs.map(function(p) {
			return E('div', { 'class': 'gl-kv-row' }, [
				E('span', { 'class': 'gl-kv-key' }, [ p[0] ]),
				E('span', { 'class': 'gl-kv-val' }, [ String(p[1] ?? '-') ])
			]);
		}));
	},

	card: function(title, badgeEl, bodyNodes, footerNodes) {
		return E('div', { 'class': 'gl-card' }, [
			E('div', {}, [
				E('div', { 'class': 'gl-card-header' }, [
					E('h3', { 'class': 'gl-card-title' }, [ title ]),
					badgeEl || E('span')
				]),
				E('div', {}, Array.isArray(bodyNodes) ? bodyNodes : [ bodyNodes ])
			]),
			(footerNodes && footerNodes.length) ? E('div', { 'class': 'gl-card-footer' }, footerNodes) : E('span')
		]);
	},

	notifySaved: function(msg) {
		ui.addNotification(null, E('p', msg || _('Configuration saved and applied.')), 'info');
	},

	notifyError: function(msg) {
		ui.addNotification(null, E('p', msg || _('Failed to save configuration.')), 'danger');
	}
});
