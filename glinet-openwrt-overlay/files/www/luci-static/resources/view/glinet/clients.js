'use strict';
'require view';
'require ui';
'require glinet_ui as glui';

return view.extend({
	load: function() {
		return glui.getClientsQos();
	},

	render: function(data) {
		const self = this;
		const clients = data.clients || [];
		const bl = data.blocklist || {};
		const qos = data.qos || {};
		const pc = data.parental || {};

		// Format byte helper
		function formatBytes(bytes) {
			if (!bytes || bytes === 0) return '0 B';
			const k = 1024;
			const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
		}

		// 1. Connected Clients Table Card
		const clientRows = clients.length ? clients.map(function(c) {
			return E('tr', {}, [
				E('td', {}, [
					E('div', { 'style': 'font-weight:600;color:#0f172a;' }, [ c.hostname || _('Unknown Device') ]),
					E('small', { 'style': 'font-family:monospace;color:#64748b;' }, [ c.mac ])
				]),
				E('td', { 'style': 'font-family:monospace;font-weight:500;' }, [ c.ip || '-' ]),
				E('td', {}, [
					glui.badge(c.interface ? c.interface.toUpperCase() : 'LAN', (c.interface === 'guest') ? 'warn' : 'on')
				]),
				E('td', {}, [
					E('div', { 'style': 'font-size:12px;color:#475569;' }, [ '↓ ' + formatBytes(c.rx_bytes) ]),
					E('div', { 'style': 'font-size:12px;color:#475569;' }, [ '↑ ' + formatBytes(c.tx_bytes) ])
				]),
				E('td', {}, [
					E('div', { 'style': 'display:flex;align-items:center;gap:6px;' }, [
						E('input', {
							'type': 'number',
							'id': 'cl-down-' + c.mac.replace(/:/g, ''),
							'value': c.download_limit || '',
							'placeholder': '↓ Kbps',
							'style': 'width:80px;padding:3px 6px;font-size:12px;'
						}),
						E('input', {
							'type': 'number',
							'id': 'cl-up-' + c.mac.replace(/:/g, ''),
							'value': c.upload_limit || '',
							'placeholder': '↑ Kbps',
							'style': 'width:80px;padding:3px 6px;font-size:12px;'
						})
					])
				]),
				E('td', {}, [
					E('div', { 'style': 'display:flex;gap:6px;' }, [
						E('button', {
							'class': 'gl-btn gl-btn-secondary',
							'style': 'padding:4px 8px;font-size:12px;',
							'click': function() {
								const down = parseInt(document.getElementById('cl-down-' + c.mac.replace(/:/g, '')).value || 0, 10);
								const up = parseInt(document.getElementById('cl-up-' + c.mac.replace(/:/g, '')).value || 0, 10);
								return glui.saveClientsQos('client_rule', c.mac, c.blocked, up, down, c.hostname, {}).then(function() {
									glui.notifySaved(_('Speed limit updated for ') + (c.hostname || c.mac));
								}).catch(function(err) {
									glui.notifyError(_('Failed to update speed limit: ') + (err.message || err));
								});
							}
						}, _('Limit')),
						E('button', {
							'class': 'gl-btn ' + (c.blocked ? 'gl-btn-secondary' : 'gl-btn-danger'),
							'style': 'padding:4px 8px;font-size:12px;',
							'click': function() {
								const newBlocked = !c.blocked;
								return glui.saveClientsQos('client_rule', c.mac, newBlocked, c.upload_limit || 0, c.download_limit || 0, c.hostname, {}).then(function() {
									glui.notifySaved(newBlocked ? _('Client blocked from network.') : _('Client unblocked.'));
									location.reload();
								}).catch(function(err) {
									glui.notifyError(_('Failed to update client status: ') + (err.message || err));
								});
							}
						}, c.blocked ? _('Unblock') : _('Block'))
					])
				])
			]);
		}) : [
			E('tr', {}, [ E('td', { 'colspan': 6, 'style': 'text-align:center;padding:16px;color:#64748b;' }, _('No active clients detected in ARP/DHCP tables.')) ])
		];

		const clientsCard = glui.card(
			_('Active Network Clients & Device Control'),
			glui.badge(clients.length + ' ' + _('Devices Online'), clients.length ? 'on' : 'off'),
			[
				E('div', { 'style': 'overflow-x:auto;' }, [
					E('table', { 'class': 'gl-table' }, [
						E('thead', {}, [
							E('tr', {}, [
								E('th', {}, _('Device / MAC')),
								E('th', {}, _('IP Address')),
								E('th', {}, _('Interface')),
								E('th', {}, _('Traffic (Rx/Tx)')),
								E('th', {}, _('Speed Limit (Kbps)')),
								E('th', {}, _('Actions'))
							])
						]),
						E('tbody', {}, clientRows)
					])
				])
			]
		);

		// 2. Global Blocklist / Access Control Card
		const blocklistCard = glui.card(
			_('Access Control & MAC Filter'),
			glui.badge(bl.enable ? (bl.mode === 'black' ? _('Blacklist Mode') : _('Whitelist Mode')) : _('Disabled'), bl.enable ? 'on' : 'off'),
			[
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-bw-en', 'checked': bl.enable ? 'checked' : null }),
					_('Enable MAC Address Access Control')
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Access Control Policy Mode')),
					E('select', { 'id': 'gl-bw-mode' }, [
						E('option', { 'value': 'black', 'selected': bl.mode === 'black' ? 'selected' : null }, _('Blacklist (Block devices listed below)')),
						E('option', { 'value': 'white', 'selected': bl.mode === 'white' ? 'selected' : null }, _('Whitelist (ONLY allow devices listed below)'))
					])
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Blacklisted MAC Addresses (comma or space separated)')),
					E('textarea', { 'id': 'gl-bw-black', 'rows': 3, 'placeholder': '94:83:c4:00:11:22, a0:b1:c2:d3:e4:f5' }, [ (bl.black_macs || []).join('\n') ])
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Whitelisted MAC Addresses (comma or space separated)')),
					E('textarea', { 'id': 'gl-bw-white', 'rows': 3, 'placeholder': '94:83:c4:11:22:33' }, [ (bl.white_macs || []).join('\n') ])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const en = document.getElementById('gl-bw-en').checked;
						const mode = document.getElementById('gl-bw-mode').value;
						const black = document.getElementById('gl-bw-black').value;
						const white = document.getElementById('gl-bw-white').value;
						return glui.saveClientsQos('save_all', '', false, 0, 0, '', {
							bw_enable: en,
							bw_mode: mode,
							black_macs: black,
							white_macs: white
						}).then(function() {
							glui.notifySaved(_('Access control rules saved and applied.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to save access control: ') + (err.message || err));
						});
					})
				}, _('Apply Access Control'))
			]
		);

		// 3. Global QoS & Bufferbloat Management (SQM) Card
		const qosCard = glui.card(
			_('Global QoS & Bandwidth Management'),
			glui.badge(qos.enable ? _('QoS Active') : _('QoS Disabled'), qos.enable ? 'on' : 'off'),
			[
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-qos-en', 'checked': qos.enable ? 'checked' : null }),
					_('Enable Smart Queue Management (SQM CAKE / FQ_CoDel)')
				]),
				E('p', { 'style': 'font-size:12.5px;color:#64748b;margin:0 0 10px 0;' },
					_('Prevents bufferbloat and lag during gaming, streaming, or video calls by dynamically managing packet queues.')
				),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Total Uplink Bandwidth (Mbps)')),
						E('input', { 'type': 'number', 'id': 'gl-qos-up', 'value': qos.upload || 100 })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Total Downlink Bandwidth (Mbps)')),
						E('input', { 'type': 'number', 'id': 'gl-qos-down', 'value': qos.download || 100 })
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const en = document.getElementById('gl-qos-en').checked;
						const up = parseInt(document.getElementById('gl-qos-up').value || 100, 10);
						const down = parseInt(document.getElementById('gl-qos-down').value || 100, 10);
						return glui.saveClientsQos('save_all', '', false, 0, 0, '', {
							qos_enable: en,
							qos_upload: up,
							qos_download: down
						}).then(function() {
							glui.notifySaved(_('Global QoS bandwidth settings applied.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to save QoS settings: ') + (err.message || err));
						});
					})
				}, _('Save QoS Settings'))
			]
		);

		// 4. Parental Controls & Content Filter Card
		const parentalCard = glui.card(
			_('Parental Controls & Domain Blocking'),
			glui.badge(pc.enable ? _('Active') : _('Disabled'), pc.enable ? 'on' : 'off'),
			[
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-pc-en', 'checked': pc.enable ? 'checked' : null }),
					_('Enable Parental Controls (Domain Filtering & Restrictions)')
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Target Client MACs Subject to Restrictions')),
					E('input', {
						'type': 'text',
						'id': 'gl-pc-macs',
						'value': (pc.blocked_macs || []).join(', '),
						'placeholder': 'e.g. 11:22:33:44:55:66, 77:88:99:aa:bb:cc (leave empty for all devices)'
					})
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Blocked Domains & Websites (comma or newline separated)')),
					E('textarea', {
						'id': 'gl-pc-domains',
						'rows': 4,
						'placeholder': 'tiktok.com\ninstagram.com\nroblox.com\nyoutube.com'
					}, [ (pc.blocked_domains || []).join('\n') ])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const en = document.getElementById('gl-pc-en').checked;
						const macs = document.getElementById('gl-pc-macs').value;
						const domains = document.getElementById('gl-pc-domains').value;
						return glui.saveClientsQos('save_all', '', false, 0, 0, '', {
							pc_enable: en,
							pc_macs: macs,
							pc_domains: domains
						}).then(function() {
							glui.notifySaved(_('Parental control filtering saved.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to save parental controls: ') + (err.message || err));
						});
					})
				}, _('Apply Parental Restrictions'))
			]
		);

		return E('div', { 'class': 'gl-wrap' }, [
			glui.renderHeader('clients', _('Manage Connected Clients, Per-Device Speed Limits, Blacklist/Whitelist, QoS, and Parental Controls')),
			clientsCard,
			E('div', { 'class': 'gl-grid' }, [ blocklistCard, qosCard ]),
			parentalCard
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
