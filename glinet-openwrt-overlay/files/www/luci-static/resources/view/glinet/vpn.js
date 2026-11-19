'use strict';
'require view';
'require ui';
'require glinet_ui as glui';

return view.extend({
	load: function() {
		return glui.getVpnDetails();
	},

	render: function(data) {
		const self = this;
		const wgC = data.wg_client || {};
		const wgS = data.wg_server || {};
		const ovC = data.ovpn_client || {};
		const ovS = data.ovpn_server || {};
		const pol = data.policy || {};
		const msh = data.mesh || {};

		// Card 1: WireGuard Client
		const wgProfiles = wgC.profiles || [];
		const wgProfilesSelect = E('select', { 'id': 'gl-wgc-profile' },
			wgProfiles.length ? wgProfiles.map(function(p) {
				return E('option', {
					'value': p.id,
					'selected': (p.id === wgC.active_profile) ? 'selected' : null
				}, [ p.name + ' (' + (p.endpoint || p.address) + ')' ]);
			}) : [ E('option', { 'value': '' }, _('-- No WireGuard Profiles Added --')) ]
		);

		const wgClientCard = glui.card(
			_('1. WireGuard Client'),
			glui.badge(wgC.enabled ? (wgC.up ? _('Connected') : _('Connecting...')) : _('Disabled'), wgC.enabled ? (wgC.up ? 'on' : 'warn') : 'off'),
			[
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-wgc-en', 'checked': wgC.enabled ? 'checked' : null }),
					_('Enable WireGuard Client')
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Active WireGuard Profile')),
					wgProfilesSelect
				]),
				wgC.up ? E('div', { 'class': 'gl-kv-list', 'style': 'margin-bottom:14px;' }, [
					glui.kvList([
						[ _('Tunnel IPv4'), wgC.ipaddr || '-' ],
						[ _('Status'), _('Secure Tunnel Active') ]
					])
				]) : E('span'),
				E('details', { 'style': 'background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;margin-top:8px;' }, [
					E('summary', { 'style': 'font-weight:600;cursor:pointer;color:#0f766e;' }, _('+ Add / Import WireGuard Configuration (.conf)')),
					E('div', { 'style': 'margin-top:10px;' }, [
						E('div', { 'class': 'gl-field' }, [
							E('label', {}, _('Profile Name')),
							E('input', { 'type': 'text', 'id': 'gl-wgc-newname', 'placeholder': 'e.g. Mullvad-US / Proton-Fast' })
						]),
						E('div', { 'class': 'gl-field' }, [
							E('label', {}, _('Paste WireGuard Configuration (.conf text)')),
							E('textarea', {
								'id': 'gl-wgc-conftext',
								'rows': 6,
								'placeholder': '[Interface]\nPrivateKey = ...\nAddress = 10.2.0.2/32\nDNS = 1.1.1.1\n\n[Peer]\nPublicKey = ...\nEndpoint = 198.51.100.1:51820\nAllowedIPs = 0.0.0.0/0'
							})
						]),
						E('button', {
							'class': 'gl-btn gl-btn-secondary',
							'click': ui.createHandlerFn(this, function() {
								const name = (document.getElementById('gl-wgc-newname').value || '').trim();
								const text = (document.getElementById('gl-wgc-conftext').value || '').trim();
								if (!name || !text) {
									ui.addNotification(null, E('p', _('Please enter a profile name and paste configuration text.')), 'danger');
									return;
								}
								return glui.saveVpn('wg_client', { action: 'import', name: name, conf_text: text }).then(function() {
									glui.notifySaved(_('WireGuard profile imported.'));
									location.reload();
								});
							})
						}, _('Import Profile'))
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const en = document.getElementById('gl-wgc-en').checked;
						const prof = document.getElementById('gl-wgc-profile').value;
						return glui.saveVpn('wg_client', { enable: en, active_profile: prof }).then(function() {
							glui.notifySaved(_('WireGuard Client settings saved and applied.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to save WireGuard client: ') + (err.message || err));
						});
					})
				}, _('Save & Apply WG Client'))
			]
		);

		// Card 2: WireGuard Server
		const wgServerCard = glui.card(
			_('2. WireGuard Server'),
			glui.badge(wgS.enable ? _('Server Running') : _('Server Disabled'), wgS.enable ? 'on' : 'off'),
			[
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-wgs-en', 'checked': wgS.enable ? 'checked' : null }),
					_('Enable WireGuard Server')
				]),
				E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:10px;' }, [
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Server Tunnel IP/Subnet')),
						E('input', { 'type': 'text', 'id': 'gl-wgs-addr', 'value': wgS.address_v4 || '10.0.0.1/24' })
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Listen Port')),
						E('input', { 'type': 'number', 'id': 'gl-wgs-port', 'value': wgS.port || 51820 })
					])
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Server Public Key')),
					E('input', { 'type': 'text', 'readonly': 'readonly', 'value': wgS.public_key || _('Generated upon start') })
				]),
				E('details', { 'style': 'background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;margin-top:8px;' }, [
					E('summary', { 'style': 'font-weight:600;cursor:pointer;color:#0f766e;' }, _('Configured Peers / Add Client Peer')),
					E('div', { 'style': 'margin-top:10px;' }, [
						E('table', { 'class': 'gl-table', 'style': 'margin-bottom:12px;' }, [
							E('thead', {}, [
								E('tr', {}, [
									E('th', {}, _('Name')),
									E('th', {}, _('Client Tunnel IP')),
									E('th', {}, _('Action'))
								])
							]),
							E('tbody', {}, (wgS.peers && wgS.peers.length) ? wgS.peers.map(function(peer) {
								return E('tr', {}, [
									E('td', { 'style': 'font-weight:600;' }, [ peer.name ]),
									E('td', {}, [ peer.client_ip ]),
									E('td', {}, [
										E('button', {
											'class': 'gl-btn gl-btn-secondary',
											'style': 'color:#b91c1c;padding:3px 8px;',
											'click': function() {
												return glui.saveVpn('wg_server', { action: 'del_peer', peer_id: peer.id }).then(function() {
													glui.notifySaved(_('Peer removed.'));
													location.reload();
												});
											}
										}, _('Delete'))
									])
								]);
							}) : [
								E('tr', {}, [ E('td', { 'colspan': 3, 'style': 'text-align:center;color:#64748b;' }, _('No client peers added.')) ])
							])
						]),
						E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
							E('div', { 'class': 'gl-field' }, [
								E('label', {}, _('New Peer Name')),
								E('input', { 'type': 'text', 'id': 'gl-wgs-peer-name', 'placeholder': 'e.g. Phone / Laptop' })
							]),
							E('div', { 'class': 'gl-field' }, [
								E('label', {}, _('New Peer IP')),
								E('input', { 'type': 'text', 'id': 'gl-wgs-peer-ip', 'value': '10.0.0.2/32' })
							])
						]),
						E('button', {
							'class': 'gl-btn gl-btn-secondary',
							'click': ui.createHandlerFn(this, function() {
								const pName = (document.getElementById('gl-wgs-peer-name').value || '').trim();
								const pIp = (document.getElementById('gl-wgs-peer-ip').value || '').trim();
								if (!pName) {
									ui.addNotification(null, E('p', _('Please enter a peer name.')), 'danger');
									return;
								}
								return glui.saveVpn('wg_server', { action: 'add_peer', name: pName, client_ip: pIp }).then(function() {
									glui.notifySaved(_('Peer generated.'));
									location.reload();
								});
							})
						}, _('+ Generate Peer Keys & Add'))
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const en = document.getElementById('gl-wgs-en').checked;
						const addr = document.getElementById('gl-wgs-addr').value;
						const port = document.getElementById('gl-wgs-port').value;
						return glui.saveVpn('wg_server', { enable: en, address_v4: addr, port: port }).then(function() {
							glui.notifySaved(_('WireGuard Server settings saved and applied.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to save WireGuard server: ') + (err.message || err));
						});
					})
				}, _('Save & Apply WG Server'))
			]
		);

		// Card 3: OpenVPN Client & Server
		const ovpnProfiles = ovC.profiles || [];
		const ovpnProfilesSelect = E('select', { 'id': 'gl-ovc-profile' },
			ovpnProfiles.length ? ovpnProfiles.map(function(p) {
				return E('option', {
					'value': p.id,
					'selected': (p.id === ovC.active_profile) ? 'selected' : null
				}, [ p.name ]);
			}) : [ E('option', { 'value': '' }, _('-- No OpenVPN Profiles Added --')) ]
		);

		const ovpnCard = glui.card(
			_('3. OpenVPN Client & Server'),
			glui.badge(ovC.enable ? _('Client Active') : (ovS.enable ? _('Server Active') : _('Off')), (ovC.enable || ovS.enable) ? 'on' : 'off'),
			[
				E('div', { 'style': 'margin-bottom:12px;' }, [
					E('h4', { 'style': 'font-size:14px;font-weight:700;margin:0 0 8px 0;color:#0f172a;' }, _('OpenVPN Client')),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-ovc-en', 'checked': ovC.enable ? 'checked' : null }),
						_('Enable OpenVPN Client')
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Active OpenVPN Profile')),
						ovpnProfilesSelect
					]),
					E('details', { 'style': 'background:#f8fafc;padding:8px 10px;border-radius:6px;border:1px solid #e2e8f0;' }, [
						E('summary', { 'style': 'font-weight:600;font-size:13px;cursor:pointer;color:#0f766e;' }, _('+ Add OpenVPN (.ovpn) Profile')),
						E('div', { 'style': 'margin-top:8px;' }, [
							E('div', { 'class': 'gl-field' }, [
								E('label', {}, _('Profile Name')),
								E('input', { 'type': 'text', 'id': 'gl-ovc-newname', 'placeholder': 'e.g. My-NordVPN-US' })
							]),
							E('div', { 'class': 'gl-field' }, [
								E('label', {}, _('Username (Optional)')),
								E('input', { 'type': 'text', 'id': 'gl-ovc-user' })
							]),
							E('div', { 'class': 'gl-field' }, [
								E('label', {}, _('Paste .ovpn Content')),
								E('textarea', { 'id': 'gl-ovc-text', 'rows': 4, 'placeholder': 'client\ndev tun\nproto udp\nremote ...' })
							]),
							E('button', {
								'class': 'gl-btn gl-btn-secondary',
								'click': ui.createHandlerFn(this, function() {
									const name = (document.getElementById('gl-ovc-newname').value || '').trim();
									const user = (document.getElementById('gl-ovc-user').value || '').trim();
									const text = (document.getElementById('gl-ovc-text').value || '').trim();
									if (!name || !text) {
										ui.addNotification(null, E('p', _('Please enter a profile name and paste .ovpn text.')), 'danger');
										return;
									}
									return glui.saveVpn('openvpn', { profile_name: name, username: user, ovpn_text: text, client_enable: true }).then(function() {
										glui.notifySaved(_('OpenVPN profile imported.'));
										location.reload();
									});
								})
							}, _('Upload / Save .ovpn Profile'))
						])
					])
				]),
				E('hr', { 'style': 'border:none;border-top:1px solid #f1f5f9;margin:12px 0;' }),
				E('div', {}, [
					E('h4', { 'style': 'font-size:14px;font-weight:700;margin:0 0 8px 0;color:#0f172a;' }, _('OpenVPN Server')),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-ovs-en', 'checked': ovS.enable ? 'checked' : null }),
						_('Enable OpenVPN Server')
					]),
					E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
						E('div', { 'class': 'gl-field' }, [
							E('label', {}, _('Port')),
							E('input', { 'type': 'number', 'id': 'gl-ovs-port', 'value': ovS.port || 1194 })
						]),
						E('div', { 'class': 'gl-field' }, [
							E('label', {}, _('Protocol')),
							E('select', { 'id': 'gl-ovs-proto' }, [
								E('option', { 'value': 'udp', 'selected': ovS.proto === 'udp' ? 'selected' : null }, 'UDP'),
								E('option', { 'value': 'tcp', 'selected': ovS.proto === 'tcp' ? 'selected' : null }, 'TCP')
							])
						])
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const cEn = document.getElementById('gl-ovc-en').checked;
						const sEn = document.getElementById('gl-ovs-en').checked;
						const sPort = document.getElementById('gl-ovs-port').value;
						const sProto = document.getElementById('gl-ovs-proto').value;
						return glui.saveVpn('openvpn', { client_enable: cEn, server_enable: sEn, server_port: sPort, server_proto: sProto }).then(function() {
							glui.notifySaved(_('OpenVPN settings saved.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to save OpenVPN settings: ') + (err.message || err));
						});
					})
				}, _('Save OpenVPN Settings'))
			]
		);

		// Card 4: VPN Policy Routing & Kill Switch (The GL.iNet Special Feature!)
		const policyCard = glui.card(
			_('4. VPN Cascading & Policy Routing'),
			glui.badge(pol.kill_switch ? _('Kill Switch Active') : _('Standard Routing'), pol.kill_switch ? 'warn' : 'off'),
			[
				E('label', { 'class': 'gl-check', 'style': 'color:#991b1b;' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-pol-kill', 'checked': pol.kill_switch ? 'checked' : null }),
					_('VPN Kill Switch (Block ALL Internet if VPN drops — Zero Leak)')
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-pol-wanacc', 'checked': pol.wan_access ? 'checked' : null }),
					_('Allow Direct Access to Local LAN & Router Web UI while VPN Active')
				]),
				E('label', { 'class': 'gl-check' }, [
					E('input', { 'type': 'checkbox', 'id': 'gl-pol-guest', 'checked': pol.guest_vpn ? 'checked' : null }),
					_('Route Guest Wi-Fi Clients through VPN')
				]),
				E('div', { 'class': 'gl-field', 'style': 'margin-top:10px;' }, [
					E('label', {}, _('Policy Routing Mode')),
					E('select', { 'id': 'gl-pol-mode' }, [
						E('option', { 'value': 'global', 'selected': pol.mode === 'global' ? 'selected' : null }, _('Global Proxy (Route ALL Traffic via VPN)')),
						E('option', { 'value': 'mac', 'selected': pol.mode === 'mac' ? 'selected' : null }, _('Based on Client Device (MAC Address)')),
						E('option', { 'value': 'domain', 'selected': pol.mode === 'domain' ? 'selected' : null }, _('Based on Target Domain / Website')),
						E('option', { 'value': 'ip', 'selected': pol.mode === 'ip' ? 'selected' : null }, _('Based on Destination IP / Subnet'))
					])
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Policy Rule Direction')),
					E('select', { 'id': 'gl-pol-rtype' }, [
						E('option', { 'value': 'bypass', 'selected': pol.rule_type === 'bypass' ? 'selected' : null }, _('Bypass VPN for entries in list (Direct WAN)')),
						E('option', { 'value': 'proxy', 'selected': pol.rule_type === 'proxy' ? 'selected' : null }, _('Only use VPN for entries in list'))
					])
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('MAC Address Filter List (comma or space separated)')),
					E('input', {
						'type': 'text',
						'id': 'gl-pol-macs',
						'value': (pol.mac_list || []).join(', '),
						'placeholder': '94:83:c4:11:22:33, a0:b1:c2:d3:e4:f5'
					}),
					E('small', {}, _('Clients in this list follow the bypass / proxy rule chosen above.'))
				]),
				E('div', { 'class': 'gl-field' }, [
					E('label', {}, _('Domain / Website Filter List (comma or space separated)')),
					E('input', {
						'type': 'text',
						'id': 'gl-pol-domains',
						'value': (pol.domain_list || []).join(', '),
						'placeholder': 'netflix.com, hulu.com, internal.company.com'
					}),
					E('small', {}, _('Domains redirected dynamically using dnsmasq ipsets / nft sets.'))
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const kill = document.getElementById('gl-pol-kill').checked;
						const wanacc = document.getElementById('gl-pol-wanacc').checked;
						const guest = document.getElementById('gl-pol-guest').checked;
						const mode = document.getElementById('gl-pol-mode').value;
						const rtype = document.getElementById('gl-pol-rtype').value;
						const macs = document.getElementById('gl-pol-macs').value;
						const domains = document.getElementById('gl-pol-domains').value;

						return glui.saveVpn('policy', {
							kill_switch: kill,
							wan_access: wanacc,
							service_policy: true,
							proxy_mode: '0',
							mode: mode,
							rule_type: rtype,
							mac_list: macs,
							domain_list: domains,
							guest_vpn: guest
						}).then(function() {
							glui.notifySaved(_('VPN Policy Routing rules applied successfully.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to apply VPN policy: ') + (err.message || err));
						});
					})
				}, _('Apply VPN Policies & Kill Switch'))
			]
		);

		// Card 5: Tailscale, ZeroTier & Tor Mesh Networks
		const meshCard = glui.card(
			_('5. Tailscale, ZeroTier & Tor Routing'),
			glui.badge((msh.tailscale_enabled || msh.zerotier_enabled || msh.tor_enabled) ? _('Mesh Active') : _('Off'), (msh.tailscale_enabled || msh.zerotier_enabled || msh.tor_enabled) ? 'on' : 'off'),
			[
				E('div', { 'style': 'margin-bottom:12px;' }, [
					E('h4', { 'style': 'font-size:14px;font-weight:700;margin:0 0 6px 0;color:#0f172a;' }, _('Tailscale Mesh VPN')),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-ts-en', 'checked': msh.tailscale_enabled ? 'checked' : null }),
						_('Enable Tailscale')
					]),
					E('div', { 'style': 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' }, [
						E('div', { 'class': 'gl-field' }, [
							E('label', {}, _('Auth Key (Optional)')),
							E('input', { 'type': 'password', 'id': 'gl-ts-key', 'value': msh.tailscale_auth_key || '', 'placeholder': 'tskey-auth-...' })
						]),
						E('div', { 'class': 'gl-field' }, [
							E('label', {}, _('Exit Node IP (Optional)')),
							E('input', { 'type': 'text', 'id': 'gl-ts-exit', 'value': msh.tailscale_exit_node || '', 'placeholder': '100.x.y.z' })
						])
					]),
					E('div', { 'style': 'display:flex;gap:16px;' }, [
						E('label', { 'class': 'gl-check' }, [
							E('input', { 'type': 'checkbox', 'id': 'gl-ts-lan', 'checked': msh.tailscale_lan ? 'checked' : null }),
							_('Allow Remote Access to LAN')
						]),
						E('label', { 'class': 'gl-check' }, [
							E('input', { 'type': 'checkbox', 'id': 'gl-ts-wan', 'checked': msh.tailscale_wan ? 'checked' : null }),
							_('Advertise as Exit Node')
						])
					])
				]),
				E('hr', { 'style': 'border:none;border-top:1px solid #f1f5f9;margin:10px 0;' }),
				E('div', { 'style': 'margin-bottom:12px;' }, [
					E('h4', { 'style': 'font-size:14px;font-weight:700;margin:0 0 6px 0;color:#0f172a;' }, _('ZeroTier SD-WAN')),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-zt-en', 'checked': msh.zerotier_enabled ? 'checked' : null }),
						_('Enable ZeroTier')
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('ZeroTier 16-digit Network ID')),
						E('input', { 'type': 'text', 'id': 'gl-zt-id', 'value': msh.zerotier_id || '', 'placeholder': 'e.g. 8056c2e21c000001' })
					]),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-zt-lan', 'checked': msh.zerotier_lan ? 'checked' : null }),
						_('Allow ZeroTier to Access Router LAN Devices')
					])
				]),
				E('hr', { 'style': 'border:none;border-top:1px solid #f1f5f9;margin:10px 0;' }),
				E('div', {}, [
					E('h4', { 'style': 'font-size:14px;font-weight:700;margin:0 0 6px 0;color:#0f172a;' }, _('Tor Anonymity Network')),
					E('label', { 'class': 'gl-check' }, [
						E('input', { 'type': 'checkbox', 'id': 'gl-tor-en', 'checked': msh.tor_enabled ? 'checked' : null }),
						_('Route LAN Clients through Tor Network (Transparent Proxy)')
					]),
					E('div', { 'class': 'gl-field' }, [
						E('label', {}, _('Exit Node Country Code')),
						E('input', { 'type': 'text', 'id': 'gl-tor-countries', 'value': msh.tor_countries || 'all', 'placeholder': 'all, or {us}, {de}' })
					])
				])
			],
			[
				E('button', {
					'class': 'gl-btn gl-btn-primary',
					'click': ui.createHandlerFn(this, function() {
						const tsEn = document.getElementById('gl-ts-en').checked;
						const tsKey = document.getElementById('gl-ts-key').value;
						const tsExit = document.getElementById('gl-ts-exit').value;
						const tsLan = document.getElementById('gl-ts-lan').checked;
						const tsWan = document.getElementById('gl-ts-wan').checked;

						const ztEn = document.getElementById('gl-zt-en').checked;
						const ztId = (document.getElementById('gl-zt-id').value || '').trim();
						const ztLan = document.getElementById('gl-zt-lan').checked;

						const torEn = document.getElementById('gl-tor-en').checked;
						const torCc = (document.getElementById('gl-tor-countries').value || 'all').trim();

						return glui.saveVpn('mesh', {
							tailscale_enabled: tsEn,
							tailscale_auth_key: tsKey,
							tailscale_exit_node: tsExit,
							tailscale_lan: tsLan,
							tailscale_wan: tsWan,
							zerotier_enabled: ztEn,
							zerotier_id: ztId,
							zerotier_lan: ztLan,
							tor_enabled: torEn,
							tor_countries: torCc
						}).then(function() {
							glui.notifySaved(_('Mesh & Tor network settings updated.'));
						}).catch(function(err) {
							glui.notifyError(_('Failed to update mesh settings: ') + (err.message || err));
						});
					})
				}, _('Save Mesh Settings'))
			]
		);

		return E('div', { 'class': 'gl-wrap' }, [
			glui.renderHeader('vpn', _('Manage WireGuard & OpenVPN Clients/Servers, VPN Policy Routing, Kill Switch, Tailscale, ZeroTier, and Tor')),
			E('div', { 'class': 'gl-grid' }, [ wgClientCard, wgServerCard ]),
			E('div', { 'class': 'gl-grid' }, [ policyCard, ovpnCard ]),
			meshCard
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
