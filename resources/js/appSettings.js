/* 
 * Copyright (c) 2011, salesforce.com <http://salesforce.com> , inc.
 * Author: Akhilesh Gupta
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided 
 * that the following conditions are met:
 * 
 *    Redistributions of source code must retain the above copyright notice, this list of conditions and the 
 *    following disclaimer.
 *  
 *    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and 
 *    the following disclaimer in the documentation and/or other materials provided with the distribution. 
 *    
 *    Neither the name of salesforce.com <http://salesforce.com> , inc. nor the names of its contributors may be used to endorse or 
 *    promote products derived from this software without specific prior written permission.
 *  
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED 
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A 
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR 
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED 
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) 
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING 
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 * POSSIBILITY OF SUCH DAMAGE.
 */

var SettingsManager = (function () {
	
	var settings, initialized, settingsScroller, scrollerOnPage, overlay, customHostInFocus = false;
	
	var _setup = function() {
		if (!initialized) {
			initialized = true;
			settings = $j('#app_settings');
			_addEventListeners();
		}

		_renderConnectionInfo();
		settings.find('#header #title').text('Settings');
		settings.find('.page').css('visibility', 'hidden'); //Hide all panels
		settings.find('#main').css('visibility', 'visible');

		if (settings.width() < 500) settings.find('#header #left>div').text('Back');
		
		if (sessionAlive) {
			settings.find('#header #done').show();
			settings.find('#loginbtn').hide();
			settings.find('#logoutbtn').show();
		} else {
			settings.find('#loginbtn').show();
			settings.find('#logoutbtn').hide();
		}
	}
	
	function _initiateScroller(page) {
		if (page && scrollerOnPage != page) {
			if (settingsScroller) _destroyScroller();
			
			settingsScroller = createScroller(settings.find('.settings_body ' + page));
			scrollerOnPage = page;
			$j(window).orientationChange( function() { _initiateScroller(); } );
		} else if (settingsScroller) {
			settingsScroller.refresh();
		}
		settings.find('.settings_body ' + scrollerOnPage + ' a').unbind().touch(function(e) { e.stopPropagation(); });
	}
	
	var _destroyScroller = function() {
		if (settingsScroller) {
			settingsScroller.destroy();
			settingsScroller = undefined;
			scrollerOnPage = undefined;
		}
	}
	
	var _renderConnectionInfo = function() {
		var host = getLocalValue(login_host_storage_key);
		
		if (!host) {
			host = settings.find('#hosts table td')[0].id;
			setLocalValue(login_host_storage_key, host);
		}
		var hostLabel = 'Production';
		
		if (host) {
			settings.find('#connection #hostType #name').text(
				settings.find('#hosts #' + host + ' span').text()
			);
			settings.find('#hosts table td').css('color', 'black');
			settings.find('#hosts #' + host).css('color', '#395483').append(settings.find('#hosts #check'));
		}
		settings.find('#main #connection #host_url input').val(
			getLocalValue(login_host_url_storage_key)
		);
	}
	
	var _switchBack = function(from) {
		settings.find('#header #left').show().touch(
			function() {
				settings.find('#header #left').hide().unbind();
				from.changePage(settings.find('#main'), true, function() { from.css('visibility', 'hidden'); } );
				settings.find('#header #title').text('Settings');
				if(sessionAlive) settings.find('#header #done').show();
				_initiateScroller('#main');
//				_destroyScroller();
			}
		);	
	}
	
	var _addEulaResponseListeners = function(onAccept, onDecline) {
		var buttons = settings.find('#eula_buttons').show();
		buttons.find('#accept').unbind().click(onAccept);
		buttons.find('#decline').unbind().click(onDecline);
	}
	
	var _showEula = function(showButtons, callback) {
		var onSuccess = function(response) {
			var resp = $j(response); 
			resp.find('head, script').remove();
			settings.find('#eula .content').empty().append(resp);
			if (showButtons) {
				var buttons = settings.find('#eula_buttons').show();
				settings.find('#eula').css('margin-bottom', buttons.outerHeight() + 'px');
			} else {
				settings.find('#eula').css('margin-bottom', '0');
			}
//			_destroyScroller();
//			settingsScroller = createScroller(settings.find('#eula'));
		}
		
		var onComplete = function(jqXhr, textStatus) {
			_initiateScroller('#eula');
			if (typeof callback == 'function') callback(textStatus);
		}
		
		sf.getContactAppEula(onSuccess, errorCallback, onComplete);
	}
	
	var _navigatePage = function(to, titleText, showBackButton, cb) {

		if (customHostInFocus) {
			if (_validateCustomHost()) {
				settings.find('#main #connection #host_url form').submit();
			} else return;
		}
		
		var that = $j(this);
		that.addClass('cellselected');
		settings.find('#header #done').hide();
		settings.find('#main').changePage(settings.find(to), false, function() { 
			that.removeClass('cellselected'); 
			settings.find('#main').css('visibility', 'hidden');
			if (typeof cb == 'function') cb();
		});
		settings.find('#header #title').text(titleText);
		_initiateScroller(to);
		if (showBackButton) _switchBack(settings.find(to));
	}
	
	var _navigatePageWithBack = function(to, titleText, cb) {
		_navigatePage(to, titleText, true, cb)
	}
	
	var _validateCustomHost = function() {
		var url = settings.find('#main #connection #host_url input').val().trim();
		var valid = (url.length == 0 || url.endsWith('.salesforce.com'));
		if (!valid) alert('Custom host url must end with ".salesforce.com".');
		return valid;
	}
	
	var _addEventListeners = function() {
		settings.find('#main #connection #hostType').click(
			function() { _navigatePageWithBack('#hosts', 'Login Host'); }
		);
		
		settings.find('#hosts table td').touch(
			function() {
				var that = $j(this);
				that.addClass('cellselected');
				setLocalValue(login_host_storage_key, this.id);
				_renderConnectionInfo();
				setTimeout(function() {that.removeClass('cellselected');}, 100);
			}
		);
		
		settings.find('#main #connection #host_url input').focus(
			function() {
				customHostInFocus = true;
				var that = $j(this);
				that.css('text-align', 'left');
				/*var touchAction = addWindowTouchListener(that.parent(), null, 
					function() { 
						if(validateUrl(that.val().trim())) that.blur();
						return false;
					});
				that.blur(function() { removeWindowTouchListener(touchAction); });*/
			}
		).blur(
			function() {
				customHostInFocus = false;
				$j(this).val(getLocalValue(login_host_url_storage_key));
				$j(this).css('text-align', 'right');
				setTimeout(function(){ $j(document.body).scrollTop(0); }, 10);
			}
		);
		
		settings.find('#main #connection #host_url form').submit(
			function() {
				var inputField = settings.find('#main #connection #host_url input');
				
				if(_validateCustomHost()) {
					setLocalValue(login_host_url_storage_key, inputField.val());
					inputField.blur();
				}
				return false;
			});
		
		settings.find('#main #help #help_about').click(
			function() { _navigatePageWithBack('#about', 'About'); }
		);
		
		settings.find('#main #help #help_faq').click(
			function() { 
				_navigatePageWithBack('#faq', 'FAQ', function() { /*_destroyScroller(); settingsScroller = createScroller(settings.find('#faq')); */}); 
			}
		);
		
		settings.find('#main #help #help_eula').click(
			function() { 
				_navigatePageWithBack('#eula', 'Contact Viewer EULA', _showEula);
			}
		);
		
		settings.find('#loginbtn').unbind().click( authorizeUser ).touch( function(e) { e.stopPropagation(); });
    	settings.find('#logoutbtn').unbind().click(function(e) {
        	// Delete the saved refresh token
	        var resp = confirm('Logout user ' + username + '?');
    	    if (resp) {
				logout(false);
				/*$j('#app_settings #username').html('None');
				$j('#app_settings #logoutbtn').hide();
				$j('#app_settings #loginbtn').show();*/
			}
    	}).touch( function(e) { e.stopPropagation(); });
    };
	
	var _positionCenter = function() {
		settings.positionCenterOf(window);
	};
	
	return {
		show: function() {
		
			_setup();
			
			var that = this;
			overlay = $j('#loggedin').addOverlay();
			
			settings.find('#username').setText(username || 'None');
	
			var loc = { left: ($j(window).width() - settings.outerWidth(false))/2, top: 0 };
			settings.hide().css(loc).css('zIndex', $j.topZIndex(overlay.elem) + 10);
			var initialY = window.innerHeight;
			var finalY = (window.innerHeight - settings.height())/2;
		
			var onComplete = function() {
				that.hide();
				$j(this).unbind('click');
				if(!sessionAlive) window.location = getBaseUrl();
			}
			settings.find('#header #done').unbind('click').click(onComplete);
			if(!sessionAlive) settings.find('#header #done').hide();
		
			settings.show().slideIn('Y', initialY, finalY, _positionCenter);
			_initiateScroller('#main');
			settings.orientationChange(_positionCenter);
		},

		hide: function(callback) {
			var finalY = window.innerHeight;
			var onComplete = function() {
				settings.hide();
				overlay.hide();
				if (typeof callback == 'function') callback();
			}
			settings.slideOut('Y', finalY, onComplete);
			_destroyScroller();
			settings.unbindOrientationChange(_positionCenter);
		},
		
		showEula: function(onAccept, onDecline) {
			this.show();
			_navigatePage('#eula', 'End User License Agreement', false, 
				function() { _showEula(true); _addEulaResponseListeners(onAccept, onDecline); });
		},
		
		hideEula: function() {
			this.hide(function() {
				settings.find('#eula').changePage(settings.find('#main'), true);
				settings.find('#eula').css('visibility', 'hidden');
				settings.find('#eula_buttons').hide();
				settings.find('#header #title').text('Settings');
			});
		}
	};
})();