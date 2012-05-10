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
        
        if (ManageUserSession.isActive()) {
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
            
            settingsScroller = createScroller(settings.find('.settings_body ' + page), null, {onBeforeScrollStart: function() {}});
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
        var host = ManageUserSession.getLoginHostType();
        
        if (!host) {
            host = settings.find('#hosts table td')[0].id;
            ManageUserSession.setLoginHostType(host);
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
            ManageUserSession.getLoginHostUrl()
        );
    }
    
    var _switchBack = function(from) {
        settings.find('#header #left').show().touch(
            function() {
                settings.find('#header #left').hide().unbind();
                if (useAnimations) {
                    from.changePage(settings.find('#main'), true, function() { from.css('visibility', 'hidden'); } );
                } else {
                    from.hide();
                    settings.find('#main').show().css('visibility', '');
                }
                settings.find('#header #title').text('Settings');
                if(ManageUserSession.isActive()) settings.find('#header #done').show();
                _initiateScroller('#main');
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
        }
        
        var onComplete = function(jqXhr, textStatus) {
            _initiateScroller('#eula');
            if (typeof callback == 'function') callback(textStatus);
        }
        
        ManageUserSession.getApiClient().getContactAppEula(onSuccess, errorCallback, onComplete);
    }
    
    var _navigatePage = function(to, titleText, showBackButton, cb) {
        var that = $j(this), onChangePage;
        
        if (customHostInFocus) {
            setTimeout(function() {
                settings.find('#main #connection #host_url input').blur();
            }, 10);
        }
        
        that.addClass('cellselected');
        settings.find('#header #done').hide();
        
        onChangePage = function() { 
            that.removeClass('cellselected'); 
            settings.find('#main').css('visibility', 'hidden');
            if (typeof cb == 'function') cb();
        }
        if (useAnimations) {
            settings.find('#main').changePage(settings.find(to), false, onChangePage);
        } else {
            settings.find('#main').hide();
            settings.find(to).show().css('visibility', '');
            onChangePage();
        }
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
                ManageUserSession.setLoginHostType(this.id);
                _renderConnectionInfo();
                setTimeout(function() {that.removeClass('cellselected');}, 100);
            }
        );
        
        settings.find('#main #connection #host_url input').focus(
            function() {
                customHostInFocus = true;
                var that = $j(this);
                that.css('text-align', 'left');
            }
        ).blur(
            function() {
                customHostInFocus = false;
                $j(this).val(ManageUserSession.getLoginHostUrl());
                $j(this).css('text-align', 'right');
                setTimeout(function(){ $j(document.body).scrollTop(0); }, 10);
            }
        );
        
        settings.find('#main #connection #host_url form').submit(
            function() {
                var inputField = settings.find('#main #connection #host_url input');
                
                if(_validateCustomHost()) {
                    ManageUserSession.setLoginHostUrl(inputField.val());
                    _renderConnectionInfo();
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
        
        settings.find('#loginbtn').unbind()
                .click( function() { prepareSession(); } )
                .touch( function(e) { e.stopPropagation(); });
        settings.find('#logoutbtn').unbind().click(function(e) {
            // Delete the saved refresh token
            var resp = confirm('Logout user ' + ManageUserSession.getUsername() + '?');
            if (resp) {
                logout(false);
            }
        }).touch( function(e) { e.stopPropagation(); });
    };
    
    var _positionCenter = function() {
        settings.positionCenterOf(window);
    };
    
    return {
        show: function() {
            var initialY, finalY, onComplete;
            
            _setup();
            overlay = $j('#loggedin').addOverlay();
            settings.find('#username').setText(ManageUserSession.getUsername() || 'None');
    
            onComplete = function() {
                SettingsManager.hide();
                $j(this).unbind('click');
                if(!ManageUserSession.isActive()) window.location = getBaseUrl();
            }
            settings.find('#header #done').unbind('click').click(onComplete);
            if(!ManageUserSession.isActive()) settings.find('#header #done').hide();
        
            initialY = window.innerHeight;
            finalY = (window.innerHeight - settings.height())/2;
            
            settings.hide().css('zIndex', $j.topZIndex(overlay.elem) + 10)
                    .css({ left: (window.innerWidth - settings.width())/2 });
            if (useAnimations) {
                settings.css({top: 0}).show().slideIn('Y', initialY, finalY);
            } else settings.css({top: finalY}).show();
            
            _initiateScroller('#main');
            settings.orientationChange(_positionCenter);
        },

        hide: function(callback) {
            var finalY = window.innerHeight,
            onComplete = function() {
                settings.hide();
                overlay.hide();
                if (typeof callback == 'function') callback();
            };
            
            if (useAnimations) settings.slideOut('Y', finalY, onComplete);
            else onComplete();
            
            _destroyScroller();
            settings.unbindOrientationChange(_positionCenter);
        },
        
        showEula: function(onAccept, onDecline) {
            SettingsManager.show();
            _navigatePage('#eula', 'End User License Agreement', false, 
                function() { _showEula(true); _addEulaResponseListeners(onAccept, onDecline); });
        },
        
        hideEula: function() {
            SettingsManager.hide(function() {
                if (useAnimations) {
                    settings.find('#eula').changePage(settings.find('#main'), true);
                } else {
                    settings.find('#eula').hide();
                    settings.find('#main').show().css('visibility', '');
                }
                settings.find('#eula').css('visibility', 'hidden');
                settings.find('#eula_buttons').hide();
                settings.find('#header #title').text('Settings');
            });
        }
    };
})();