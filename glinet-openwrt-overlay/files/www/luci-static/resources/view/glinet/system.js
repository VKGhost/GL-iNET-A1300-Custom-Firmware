'use strict';
'require view';
'require ui';
'require glinet_ui as glui';

return view.extend({
	load: function() {
		return glui.getSystemHardware();
	},

	render: function(data) {
		const self = this;
		const sFunc = data.switch_func || 'wifi';
		const sState = data.switch_state || 'on';
		const ledEn = data.led_enable;
		const ledMode = data.led_mode || 'white';
		const ledSched = data.led_schedule;
		const ledStart = data.led_start || '22:00';
		const ledEnd = data.led_end || '07:00';
		const netmode = data.netmode || 'router';
		const usbPwr = data.usb_power;
		const nas = data.nas || {};
		const cloud = data.cloud || {};
		const rTimer = data.reboot_timer || {};

		// 1. Hardware Toggle Switch Card (GL-A1300 Physical Button)
		const switchCard = glui.card(
			_('1. Hardware Toggle Switch (Side Button)'),
			glui.badge(_('Current Position: ') + sState.toUpperCase(), (sState === 'on') ? 'on' : 'off'),
			[
				E('p', { 'style': 'font-size:13px;color:#475569;margin:0 0 12px 0;' },
					_('The physical sliding switch on the left side of your GL-A1300 router can be assigned to trigger any feature instantly without logging in.')
				),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Assigned Switch Function')),
					E('select', { 'id': 'gl-hw-switch-func' }, [
						E('option', { 'value': 'wifi', 'selected': sFunc === 'wifi' ? 'selected' : null }, _('Toggle Wi-Fi On / Off (Physical RF Kill)')),
						E('option', { 'value': 'wireguard', 'selected': sFunc === 'wireguard' ? 'selected' : null }, _('Connect / Disconnect WireGuard Client')),
						E('option', { 'value': 'openvpn', 'selected': sFunc === 'openvpn' ? 'selected' : null }, _('Connect / Disconnect OpenVPN Client')),
						E('option', { 'value': 'tor', 'selected': sFunc === 'tor' ? 'selected' : null }, _('Enable / Disable Tor Anonymity Routing')),
						E('option', { 'value': 'adguardhome', 'selected': sFunc === 'adguardhome' ? 'selected' : null }, _('Toggle AdGuard Home Ad Blocking'))
					])
				]),
				E('div', { 'class': 'gl-kv-list', 'style': 'margin-top:12px;' }, [
					glui.kvList([
						[ _('Hardware GPIO Pin'), 'GPIO 0 (KEY_PROG1 / BTN_0)' ],
						[ _('Real-time State'), sState.toUpperCase() ],
						[ _('Handler Script Path'), '/etc/rc.button/switch -> /etc/gl-switch.d/' ]
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const func = document.getElementById('gl-hw-switch-func').value;
						return glui.saveSystemHardware('hardware', { switch_func: func }).then(function() {
							glui.notifySaved(_('Toggle switch action configured successfully.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to configure toggle switch: ') + (err.message || err));
						});
					})
				}, _('Save Switch Action'))
			]
		);

		// 2. LED Indicators & Sleep Schedule Card
		const ledCard = glui.card(
			_('2. Router LEDs & Night Sleep Schedule'),
			glui.badge(ledEn ? (ledSched ? _('Night Mode Active') : _('LEDs On')) : _('LEDs Off'), ledEn ? 'on' : 'off'),
			[
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-led-en', 'checked': ledEn ? 'checked' : null }),
					_('Enable Front LED Indicators')
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('LED Indicator Color / Profile')),
					E('select', { 'id': 'gl-led-mode' }, [
						E('option', { 'value': 'white', 'selected': ledMode === 'white' ? 'selected' : null }, _('Solid Soft White (Stock Normal)')),
						E('option', { 'value': 'blue', 'selected': ledMode === 'blue' ? 'selected' : null }, _('Solid Blue (Travel / Standby)')),
						E('option', { 'value': 'heartbeat', 'selected': ledMode === 'heartbeat' ? 'selected' : null }, _('Heartbeat Pulse (System Activity)')),
						E('option', { 'value': 'breathing', 'selected': ledMode === 'breathing' ? 'selected' : null }, _('Breathing Mode (Slow Glow)'))
					])
				]),
				E('hr', { 'style': 'border:none;border-top:1px solid #f1f5f9;margin:10px 0;' }),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-led-sched', 'checked': ledSched ? 'checked' : null }),
					_('Automatic Night Sleep Mode (Turn off LEDs while sleeping)')
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:10px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Sleep Start Time')),
						E('input', { 'type': 'text', 'id': 'gl-led-start', 'value': ledStart, 'placeholder': '22:00' })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Wake Time')),
						E('input', { 'type': 'text', 'id': 'gl-led-end', 'value': ledEnd, 'placeholder': '07:00' })
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const en = document.getElementById('gl-led-en').checked;
						const mode = document.getElementById('gl-led-mode').value;
						const sched = document.getElementById('gl-led-sched').checked;
						const start = document.getElementById('gl-led-start').value;
						const end = document.getElementById('gl-led-end').value;

						return glui.saveSystemHardware('hardware', {
							led_enable: en,
							led_mode: mode,
							led_schedule: sched,
							led_start: start,
							led_end: end
						}).then(function() {
							glui.notifySaved(_('LED controller updated.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to update LED controller: ') + (err.message || err));
						});
					})
				}, _('Apply LED Settings'))
			]
		);

		// 3. Operating Mode & USB Port Power Card
		const netmodeCard = glui.card(
			_('3. Router Mode & USB Power'),
			glui.badge(netmode.toUpperCase(), 'on'),
			[
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Router Operating Mode')),
					E('select', { 'id': 'gl-hw-netmode' }, [
						E('option', { 'value': 'router', 'selected': netmode === 'router' ? 'selected' : null }, _('Standard Wireless Router Mode (NAT, DHCP, Firewall)')),
						E('option', { 'value': 'ap', 'selected': netmode === 'ap' ? 'selected' : null }, _('Access Point (AP) Mode (Bridge LAN/WAN, Disable DHCP)')),
						E('option', { 'value': 'extender', 'selected': netmode === 'extender' ? 'selected' : null }, _('Wireless Extender Mode')),
						E('option', { 'value': 'wds', 'selected': netmode === 'wds' ? 'selected' : null }, _('WDS Bridged Network'))
					])
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-usb-pwr-ctl', 'checked': usbPwr ? 'checked' : null }),
					_('Enable 5V Power to USB 3.0 Port (Power cycle connected modems/drives)')
				]),
				E('div', { 'class': 'gl-field', 'style': 'margin-top:10px;' }, [
					E('label', {}, _('Daily Automatic Reboot Timer')),
					E('div', { 'style': 'display:flex;align-items:center;gap:12px;' }, [
						E('label', { 'class': 'gl-check', 'style': 'margin:0;' }, [
							E('input', { 'type': 'checkbox', 'id': 'gl-reboot-en', 'checked': rTimer.enable ? 'checked' : null }),
							_('Enable')
						]),
						E('input', { 'type': 'text', 'id': 'gl-reboot-time', 'value': rTimer.time || '04:00', 'style': 'width:120px;', 'placeholder': '04:00' })
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const nm = document.getElementById('gl-hw-netmode').value;
						const up = document.getElementById('gl-usb-pwr-ctl').checked;
						const rbEn = document.getElementById('gl-reboot-en').checked;
						const rbTm = document.getElementById('gl-reboot-time').value;

						return glui.saveSystemHardware('hardware', { netmode: nm, usb_power: up }).then(function() {
							return glui.saveSystemHardware('nas_cloud', { reboot_enable: rbEn, reboot_time: rbTm });
						}).then(function() {
							glui.notifySaved(_('Mode and system parameters updated.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to update system mode: ') + (err.message || err));
						});
					})
				}, _('Save Mode & Hardware'))
			]
		);

		// 4. File Sharing (NAS / DLNA) & GL Cloud (rtty / DDNS) Card
		const nasCloudCard = glui.card(
			_('4. Network Storage (NAS / DLNA) & Remote Access'),
			glui.badge((nas.dlna_enabled || cloud.rtty_enable) ? _('Services Active') : _('Standby'), (nas.dlna_enabled || cloud.rtty_enable) ? 'on' : 'off'),
			[
				E('div', { 'style': 'margin-bottom:12px;' }, [
					E('h4', { 'style': 'font-size:14px;font-weight:700;margin:0 0 6px 0;color:#0f172a;' }, _('USB Storage & Media Server (DLNA)')),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-dlna-en', 'checked': nas.dlna_enabled ? 'checked' : null }),
						_('Enable MiniDLNA Media Server (Stream movies/music to Smart TVs)')
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('DLNA Server Friendly Name')),
						E('input', { 'type': 'text', 'id': 'gl-dlna-name', 'value': nas.dlna_name || 'GL-A1300 DLNA' })
					]),
					E('div', { 'style': 'font-size:12px;background:#f8fafc;padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0;' }, [
						E('strong', {}, _('Detected Mounted Storage: ')),
						E('span', {}, nas.mounts || _('No external USB drives mounted.'))
					])
				]),
				E('hr', { 'style': 'border:none;border-top:1px solid #f1f5f9;margin:10px 0;' }),
				E('div', {}, [
					E('h4', { 'style': 'font-size:14px;font-weight:700;margin:0 0 6px 0;color:#0f172a;' }, _('Cloud Remote Management & rtty Reverse Proxy')),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-rtty-en', 'checked': cloud.rtty_enable ? 'checked' : null }),
						_('Enable Remote Reverse Shell / GoodCloud rtty Proxy')
					]),
					E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
						E('div', { 'class': 'gl-field' }, [
							E('label', {}, _('rtty Server Host')),
							E('input', { 'type': 'text', 'id': 'gl-rtty-host', 'value': cloud.rtty_host || '', 'placeholder': 'cloud.gl-inet.com' })
						]),
						E('div', { 'class': 'gl-field' }, [
							E('label', {}, _('Server Port / Device ID')),
							E('input', { 'type': 'text', 'id': 'gl-rtty-port', 'value': cloud.rtty_port || '5912' })
						])
					]),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-ddns-en', 'checked': cloud.ddns_enabled ? 'checked' : null }),
						_('Enable Glddns Dynamic DNS Service (xxxxxx.glddns.com)')
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const dlnaEn = document.getElementById('gl-dlna-en').checked;
						const dlnaNm = document.getElementById('gl-dlna-name').value;
						const rttyEn = document.getElementById('gl-rtty-en').checked;
						const rttyHost = document.getElementById('gl-rtty-host').value;
						const rttyPort = document.getElementById('gl-rtty-port').value;
						const ddnsEn = document.getElementById('gl-ddns-en').checked;

						return glui.saveSystemHardware('nas_cloud', {
							dlna_enabled: dlnaEn,
							dlna_name: dlnaNm,
							rtty_enable: rttyEn,
							rtty_host: rttyHost,
							rtty_port: rttyPort,
							ddns_enabled: ddnsEn
						}).then(function() {
							glui.notifySaved(_('NAS, Cloud, and DLNA settings updated.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to update storage / cloud settings: ') + (err.message || err));
						});
					})
				}, _('Save Storage & Cloud Settings'))
			]
		);

		return E('div', { 'class': 'gl-wrap' }, [
			glui.renderHeader('system', _('Configure Side Hardware Switch, LED Behavior & Night Sleep, Router Mode, USB Power, NAS, and Cloud Services')),
			E('div', { 'class': 'gl-grid' }, [ switchCard, ledCard ]),
			E('div', { 'class': 'gl-grid' }, [ netmodeCard, nasCloudCard ])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
