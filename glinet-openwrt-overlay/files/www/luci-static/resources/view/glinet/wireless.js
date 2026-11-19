'use strict';
'require view';
'require ui';
'require glinet_ui as glui';

return view.extend({
	load: function() {
		return glui.getWifiConfig();
	},

	buildWifiCard: function(slot, title, defaultDev, defaultSsid, isGuest, cfg) {
		const c = cfg || {
			section: isGuest ? (slot === 'guest_5g' ? 'guest_5g' : 'guest_2g') : ('default_' + defaultDev),
			device: defaultDev,
			enabled: !isGuest,
			ssid: defaultSsid,
			encryption: 'psk2',
			key: 'goodlife',
			hidden: false,
			isolate: isGuest,
			channel: 'auto',
			htmode: slot.indexOf('5g') >= 0 ? 'VHT80' : 'HT20',
			txpower: '20'
		};

		return glui.card(
			title,
			glui.badge(c.enabled ? _('Enabled') : _('Disabled'), c.enabled ? 'on' : 'off'),
			[
				E('input', { 'type': 'hidden', 'id': 'wf-sec-' + slot, 'value': c.section }),
				E('input', { 'type': 'hidden', 'id': 'wf-dev-' + slot, 'value': c.device }),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'wf-en-' + slot, 'checked': c.enabled ? 'checked' : null }),
					_('Enable ') + title
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Wi-Fi Name (SSID)')),
						E('input', { 'type': 'text', 'id': 'wf-ssid-' + slot, 'value': c.ssid || defaultSsid })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Wi-Fi Security')),
						E('select', { 'id': 'wf-enc-' + slot }, [
							E('option', { 'value': 'psk2', 'selected': c.encryption === 'psk2' ? 'selected' : null }, 'WPA2-PSK (AES)'),
							E('option', { 'value': 'sae-mixed', 'selected': c.encryption === 'sae-mixed' ? 'selected' : null }, 'WPA2-PSK / WPA3-SAE Mixed'),
							E('option', { 'value': 'sae', 'selected': c.encryption === 'sae' ? 'selected' : null }, 'WPA3-SAE'),
							E('option', { 'value': 'none', 'selected': c.encryption === 'none' ? 'selected' : null }, _('Open (No Encryption)'))
						])
					])
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Wi-Fi Key (Password)')),
					E('input', { 'type': 'text', 'id': 'wf-key-' + slot, 'value': c.key || '' })
				]),
				!isGuest ? E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Channel')),
						E('input', { 'type': 'text', 'id': 'wf-ch-' + slot, 'value': c.channel || 'auto', 'placeholder': 'auto' })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Channel Width')),
						E('select', { 'id': 'wf-ht-' + slot }, slot.indexOf('5g') >= 0 ? [
							E('option', { 'value': 'VHT80', 'selected': c.htmode === 'VHT80' ? 'selected' : null }, '80 MHz (VHT80)'),
							E('option', { 'value': 'VHT40', 'selected': c.htmode === 'VHT40' ? 'selected' : null }, '40 MHz (VHT40)'),
							E('option', { 'value': 'VHT20', 'selected': c.htmode === 'VHT20' ? 'selected' : null }, '20 MHz (VHT20)')
						] : [
							E('option', { 'value': 'HT20', 'selected': c.htmode === 'HT20' ? 'selected' : null }, '20 MHz (HT20)'),
							E('option', { 'value': 'HT40', 'selected': c.htmode === 'HT40' ? 'selected' : null }, '40 MHz (HT40)')
						])
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('TX Power (dBm)')),
						E('input', { 'type': 'number', 'id': 'wf-tx-' + slot, 'value': c.txpower || '20' })
					])
				]) : E('span'),
				E('div', { 'style': 'display:flex;gap:16px;flex-wrap:wrap;margin-top:4px;' }, [
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'wf-hid-' + slot, 'checked': c.hidden ? 'checked' : null }),
						_('Hide SSID Broadcast')
					]),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'wf-iso-' + slot, 'checked': c.isolate ? 'checked' : null }),
						_('AP Client Isolation')
					])
				])
			]
		);
	},

	render: function(data) {
		const ifaces = (data && data.ifaces) ? data.ifaces : {};
		const slots = [ 'main_5g', 'main_2g', 'guest_5g', 'guest_2g' ];

		const cards = [
			this.buildWifiCard('main_5g', _('5GHz Main Wi-Fi (802.11ac)'), 'radio1', 'GL-A1300-5G', false, ifaces.main_5g),
			this.buildWifiCard('main_2g', _('2.4GHz Main Wi-Fi (802.11n)'), 'radio0', 'GL-A1300', false, ifaces.main_2g),
			this.buildWifiCard('guest_5g', _('5GHz Guest Wi-Fi'), 'radio1', 'GL-A1300-Guest-5G', true, ifaces.guest_5g),
			this.buildWifiCard('guest_2g', _('2.4GHz Guest Wi-Fi'), 'radio0', 'GL-A1300-Guest', true, ifaces.guest_2g)
		];

		const extraCard = glui.card(
			_('Guest Network Subnet & Wi-Fi Schedule Timer'),
			glui.badge(data.schedule_enable ? _('Timer Active') : _('Always On'), data.schedule_enable ? 'on' : 'off'),
			[
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Guest Network Router IP')),
						E('input', { 'type': 'text', 'id': 'wf-guest-ip', 'value': data.guest_ip || '192.168.9.1' }),
						E('small', {}, _('Dedicated isolated bridge (br-guest) with independent DHCP pool'))
					]),
					E('div', { 'style': 'padding-top:22px;' }, [
						E('label', { 'class': 'gl-check' }, [
							E('input', { 'type': 'checkbox', 'id': 'wf-guest-lan', 'checked': data.guest_lan_access ? 'checked' : null }),
							_('Allow Guest Network Clients to Access Main LAN Subnet')
						])
					])
				]),
				E('hr', { 'style': 'border:none;border-top:1px solid #f1f5f9;margin:10px 0;' }),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'wf-sched-en', 'checked': data.schedule_enable ? 'checked' : null }),
					_('Enable Scheduled Wi-Fi Off / On Timer')
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Turn Wi-Fi Off At')),
						E('input', { 'type': 'text', 'id': 'wf-sched-off', 'value': data.schedule_off || '23:30', 'placeholder': '23:30' })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Turn Wi-Fi On At')),
						E('input', { 'type': 'text', 'id': 'wf-sched-on', 'value': data.schedule_on || '06:30', 'placeholder': '06:30' })
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const payload = {};
						slots.forEach(function(s) {
							const isGuest = s.indexOf('guest_') === 0;
							payload[s] = {
								section: document.getElementById('wf-sec-' + s).value,
								device: document.getElementById('wf-dev-' + s).value,
								enabled: document.getElementById('wf-en-' + s).checked,
								ssid: document.getElementById('wf-ssid-' + s).value,
								encryption: document.getElementById('wf-enc-' + s).value,
								key: document.getElementById('wf-key-' + s).value,
								hidden: document.getElementById('wf-hid-' + s).checked,
								isolate: document.getElementById('wf-iso-' + s).checked,
								channel: !isGuest ? document.getElementById('wf-ch-' + s).value : '',
								htmode: !isGuest ? document.getElementById('wf-ht-' + s).value : '',
								txpower: !isGuest ? document.getElementById('wf-tx-' + s).value : ''
							};
						});
						const guestIp = document.getElementById('wf-guest-ip').value;
						const guestLan = document.getElementById('wf-guest-lan').checked;
						const schedEn = document.getElementById('wf-sched-en').checked;
						const schedOff = document.getElementById('wf-sched-off').value;
						const schedOn = document.getElementById('wf-sched-on').value;

						return glui.setWifiConfig(payload, guestIp, guestLan, schedEn, schedOff, schedOn).then(function() {
							glui.notifySaved(_('All Wireless & Guest Wi-Fi settings saved and applied.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to save wireless settings: ') + (err.message || err));
						});
					})
				}, _('Save & Apply All Wireless Settings'))
			]
		);

		return E('div', { 'class': 'gl-wrap' }, [
			glui.renderHeader('wireless', _('Configure 5GHz & 2.4GHz Main Wi-Fi, Isolated Guest Wi-Fi, Channel/Power, and Wi-Fi Timers')),
			E('div', { 'class': 'gl-grid' }, cards),
			extraCard
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
