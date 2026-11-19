'use strict';
'require view';
'require ui';
'require glinet_ui as glui';

return view.extend({
	load: function() {
		return glui.getNetworkDns();
	},

	render: function(data) {
		const self = this;
		const lan = data.lan || {};
		const dns = data.dns || {};
		const agh = data.adguardhome || {};
		const ip6 = data.ipv6 || {};
		const edge = data.edgerouter || {};

		// 1. LAN & DHCP Card
		const lanCard = glui.card(
			_('1. LAN Network & DHCP Server'),
			glui.badge(lan.ipaddr || '192.168.8.1', 'on'),
			[
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Router LAN IP Address')),
						E('input', { 'type': 'text', 'id': 'gl-lan-ip', 'value': lan.ipaddr || '192.168.8.1' })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Subnet Mask')),
						E('input', { 'type': 'text', 'id': 'gl-lan-mask', 'value': lan.netmask || '255.255.255.0' })
					])
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-lan-dhcp-ignore', 'checked': lan.dhcp_ignore ? 'checked' : null }),
					_('Disable DHCP Server (Bridge / Static AP mode)')
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('DHCP Start IP')),
						E('input', { 'type': 'number', 'id': 'gl-lan-start', 'value': lan.dhcp_start || 100 })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Client Limit')),
						E('input', { 'type': 'number', 'id': 'gl-lan-limit', 'value': lan.dhcp_limit || 150 })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Lease Time')),
						E('input', { 'type': 'text', 'id': 'gl-lan-lease', 'value': lan.dhcp_leasetime || '12h' })
					])
				]),
				E('details', { 'style': 'background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;margin-top:8px;' }, [
					E('summary', { 'style': 'font-weight:600;cursor:pointer;color:#0f766e;' }, _('Static DHCP Leases (') + (lan.static_leases ? lan.static_leases.length : 0) + ')'),
					E('table', { 'class': 'gl-table', 'style': 'margin-top:10px;' }, [
						E('thead', {}, [
							E('tr', {}, [
								E('th', {}, _('Hostname')),
								E('th', {}, _('MAC Address')),
								E('th', {}, _('Assigned Static IP'))
							])
						]),
						E('tbody', {}, (lan.static_leases && lan.static_leases.length) ? lan.static_leases.map(function(l) {
							return E('tr', {}, [
								E('td', { 'style': 'font-weight:600;' }, [ l.name || '-' ]),
								E('td', { 'style': 'font-family:monospace;' }, [ l.mac ]),
								E('td', { 'style': 'font-family:monospace;' }, [ l.ip ])
							]);
						}) : [
							E('tr', {}, [ E('td', { 'colspan': 3, 'style': 'text-align:center;color:#64748b;' }, _('No static leases configured.')) ])
						])
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const ip = document.getElementById('gl-lan-ip').value;
						const mask = document.getElementById('gl-lan-mask').value;
						const start = parseInt(document.getElementById('gl-lan-start').value || 100, 10);
						const limit = parseInt(document.getElementById('gl-lan-limit').value || 150, 10);
						const lease = document.getElementById('gl-lan-lease').value;
						const ignore = document.getElementById('gl-lan-dhcp-ignore').checked;

						return glui.saveNetworkDns('lan', {
							ipaddr: ip,
							netmask: mask,
							dhcp_start: start,
							dhcp_limit: limit,
							dhcp_leasetime: lease,
							dhcp_ignore: ignore
						}).then(function() {
							glui.notifySaved(_('LAN and DHCP settings applied. If you changed IP, reconnect to the new address.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to save LAN settings: ') + (err.message || err));
						});
					})
				}, _('Save LAN Settings'))
			]
		);

		// 2. DNS Server & Encryption Card
		const dnsCard = glui.card(
			_('2. Custom DNS & Encryption (DoT / DoH)'),
			glui.badge((dns.mode || 'auto').toUpperCase(), (dns.mode === 'auto') ? 'off' : 'on'),
			[
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('DNS Resolution Mode')),
					E('select', { 'id': 'gl-dns-mode' }, [
						E('option', { 'value': 'auto', 'selected': dns.mode === 'auto' ? 'selected' : null }, _('Automatic (Upstream WAN / ISP DNS)')),
						E('option', { 'value': 'manual', 'selected': dns.mode === 'manual' ? 'selected' : null }, _('Manual Custom DNS Servers')),
						E('option', { 'value': 'dot', 'selected': dns.mode === 'dot' ? 'selected' : null }, _('DNS over TLS (DoT - Cloudflare / Quad9)')),
						E('option', { 'value': 'doh', 'selected': dns.mode === 'doh' ? 'selected' : null }, _('DNS over HTTPS (DoH)'))
					])
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:10px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Primary DNS Server')),
						E('input', { 'type': 'text', 'id': 'gl-dns-manual1', 'value': dns.manual_dns1 || '1.1.1.1' })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Secondary DNS Server')),
						E('input', { 'type': 'text', 'id': 'gl-dns-manual2', 'value': dns.manual_dns2 || '8.8.8.8' })
					])
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-dns-rebind', 'checked': dns.rebind_protection ? 'checked' : null }),
					_('Enable DNS Rebinding Protection (Prevent Private IP Attacks)')
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-dns-force', 'checked': dns.force_dns ? 'checked' : null }),
					_('Override Client DNS (Intercept Port 53 to Prevent DNS Leak)')
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-dns-ovpn', 'checked': dns.override_vpn ? 'checked' : null }),
					_('Allow Custom DNS to Override VPN DNS Servers')
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const mode = document.getElementById('gl-dns-mode').value;
						const m1 = document.getElementById('gl-dns-manual1').value;
						const m2 = document.getElementById('gl-dns-manual2').value;
						const rebind = document.getElementById('gl-dns-rebind').checked;
						const force = document.getElementById('gl-dns-force').checked;
						const ovpn = document.getElementById('gl-dns-ovpn').checked;

						return glui.saveNetworkDns('dns', {
							mode: mode,
							manual_dns1: m1,
							manual_dns2: m2,
							rebind_protection: rebind,
							force_dns: force,
							override_vpn: ovpn
						}).then(function() {
							glui.notifySaved(_('DNS settings updated and dnsmasq restarted.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to save DNS settings: ') + (err.message || err));
						});
					})
				}, _('Save DNS Settings'))
			]
		);

		// 3. AdGuard Home Card
		const aghCard = glui.card(
			_('3. AdGuard Home (Network-Wide Ad & Tracker Blocker)'),
			glui.badge(agh.enabled ? _('AdGuard Home Enabled') : _('AdGuard Home Disabled'), agh.enabled ? 'on' : 'off'),
			[
				E('p', { 'style': 'font-size:13px;color:#475569;margin:0 0 12px 0;' },
					_('AdGuard Home intercepts DNS queries to block ads, malicious domains, phishing, and tracking telemetry across all connected router devices.')
				),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-agh-en', 'checked': agh.enabled ? 'checked' : null }),
					_('Enable AdGuard Home Service')
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-agh-clients', 'checked': agh.handle_client_requests ? 'checked' : null }),
					_('Inspect Individual Client IP Requests (Display per-device stats in AdGuard UI)')
				]),
				E('div', { 'class': 'gl-kv-list', 'style': 'margin-top:12px;' }, [
					glui.kvList([
						[ _('Web Admin Interface Port'), agh.port || 3000 ],
						[ _('Internal DNS Port'), agh.dns_port || 3053 ],
						[ _('Binary Installed Status'), agh.installed ? _('Installed (/usr/bin/AdGuardHome)') : _('Available to Install (opkg)') ]
					])
				])
			],
			[
				agh.enabled ? E('a', {
					'class': 'gl-btn gl-btn-secondary',
					'href': 'http://' + (lan.ipaddr || window.location.hostname) + ':3000',
					'target': '_blank',
					'style': 'text-decoration:none;'
				}, _('Open AdGuard Home Dashboard ↗')) : E('span'),
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const en = document.getElementById('gl-agh-en').checked;
						const hc = document.getElementById('gl-agh-clients').checked;
						return glui.saveNetworkDns('dns', {
							agh_enabled: en,
							agh_handle_clients: hc
						}).then(function() {
							glui.notifySaved(_('AdGuard Home configuration applied.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to save AdGuard Home settings: ') + (err.message || err));
						});
					})
				}, _('Save AdGuard Home Settings'))
			]
		);

		// 4. IPv6 & Drop-in Gateway (Edgerouter) Card
		const edgeCard = glui.card(
			_('4. IPv6 & Drop-in Gateway (Edgerouter Mode)'),
			glui.badge(edge.enabled ? _('Drop-in Gateway Active') : (ip6.enabled ? _('IPv6 Active') : _('Standard Mode')), (edge.enabled || ip6.enabled) ? 'on' : 'off'),
			[
				E('div', { 'style': 'margin-bottom:12px;' }, [
					E('h4', { 'style': 'font-size:14px;font-weight:700;margin:0 0 6px 0;color:#0f172a;' }, _('IPv6 Stack Configuration')),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-ip6-en', 'checked': ip6.enabled ? 'checked' : null }),
						_('Enable Native IPv6 (DHCPv6 / SLAAC)')
					]),
					E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
						E('div', { 'class': 'gl-field' }, [
							E('label', {}, _('WAN Address Mode')),
							E('select', { 'id': 'gl-ip6-wan' }, [
								E('option', { 'value': 'auto', 'selected': ip6.wan_addrmode === 'auto' ? 'selected' : null }, 'Auto (Native)'),
								E('option', { 'value': 'nat6', 'selected': ip6.wan_addrmode === 'nat6' ? 'selected' : null }, 'NAT6'),
								E('option', { 'value': 'relay', 'selected': ip6.wan_addrmode === 'relay' ? 'selected' : null }, 'IPv6 Relay')
							])
						]),
						E('div', { 'class': 'gl-field' }, [
							E('label', {}, _('LAN Mode')),
							E('select', { 'id': 'gl-ip6-lan' }, [
								E('option', { 'value': 'nat6', 'selected': ip6.lan_mode === 'nat6' ? 'selected' : null }, 'NAT6'),
								E('option', { 'value': 'relay', 'selected': ip6.lan_mode === 'relay' ? 'selected' : null }, 'Relay')
							])
						])
					])
				]),
				E('hr', { 'style': 'border:none;border-top:1px solid #f1f5f9;margin:10px 0;' }),
				E('div', {}, [
					E('h4', { 'style': 'font-size:14px;font-weight:700;margin:0 0 6px 0;color:#0f172a;' }, _('Drop-in Gateway Mode (Edgerouter)')),
					E('p', { 'style': 'font-size:12.5px;color:#64748b;margin:0 0 10px 0;' },
						_('Allows using this GL router as a VPN gateway or AdGuard filter directly beside your existing main router without double NAT or changing LAN subnets.')
					),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-edge-en', 'checked': edge.enabled ? 'checked' : null }),
						_('Enable Drop-in Gateway Mode')
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Main Router Gateway IP')),
						E('input', { 'type': 'text', 'id': 'gl-edge-main-ip', 'value': edge.main_router_ip || '', 'placeholder': 'e.g. 192.168.1.1' })
					]),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-edge-dns', 'checked': edge.force_dns ? 'checked' : null }),
						_('Force LAN Clients to use Drop-in Gateway for DNS')
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const ip6En = document.getElementById('gl-ip6-en').checked;
						const ip6Wan = document.getElementById('gl-ip6-wan').value;
						const ip6Lan = document.getElementById('gl-ip6-lan').value;
						const edgeEn = document.getElementById('gl-edge-en').checked;
						const edgeIp = document.getElementById('gl-edge-main-ip').value;
						const edgeDns = document.getElementById('gl-edge-dns').checked;

						return glui.saveNetworkDns('ipv6', { enabled: ip6En, wan_addrmode: ip6Wan, lan_mode: ip6Lan }).then(function() {
							return glui.saveNetworkDns('edgerouter', { enabled: edgeEn, main_router_ip: edgeIp, force_dns: edgeDns });
						}).then(function() {
							glui.notifySaved(_('IPv6 and Drop-in Gateway settings updated.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to update IPv6 / Gateway settings: ') + (err.message || err));
						});
					})
				}, _('Apply Advanced Network Settings'))
			]
		);

		return E('div', { 'class': 'gl-wrap' }, [
			glui.renderHeader('network', _('Manage LAN IP & Subnets, Custom DNS & Encryption, AdGuard Home Ad Blocking, IPv6, and Drop-in Gateway Mode')),
			E('div', { 'class': 'gl-grid' }, [ lanCard, dnsCard ]),
			E('div', { 'class': 'gl-grid' }, [ aghCard, edgeCard ])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
