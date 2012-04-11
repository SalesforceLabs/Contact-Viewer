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
 
var PasscodeManager = (function () {

	var props, initialized;
	
	var _positionCenter = function() {
		var topLoc = ($j(window).height()/2 - props.passcodeElem.outerHeight()/2);
		var leftLoc = ($j(window).width()/2 - props.passcodeElem.outerWidth()/2);
		
		props.passcodeElem.css('top', topLoc + 'px').css('left', leftLoc + 'px');
	};
	
	var _positionBottom = function() {
		var transX, transY, transform;
		
		if (window.orientation == 90 || window.orientation == -90) {
/*			switch(window.orientation) {
				case 90: transX = ($j(window).width() - props.passcodeElem.height()/2 - props.passcodeElem.width()/2); break;
				case -90: transX = (props.passcodeElem.height()/2 - props.passcodeElem.width()/2); break;
			}
			transY = ($j(window).height()/2 - props.passcodeElem.height()/2);
			*/
			transX = ($j(window).width()/2 - props.passcodeElem.width()/2);
			transY = ($j(window).height() - props.passcodeElem.height());
			transform = 'translate3d(' + transX + 'px, ' + transY + 'px, 0)';
		} else {
			transY = ($j(window).height() - props.passcodeElem.outerHeight());
			transform = 'translate3d(0px, ' + transY + 'px, 0)';
		}
		
		props.passcodeElem.css('-webkit-transition-property', 'none').css('-webkit-transform', transform);
	};
	
	var _positionForIphone = function() {
		if (window.innerHeight > window.innerWidth) {
			var cssTransform = {top:($j(window).height() - $j('#passcode table').outerHeight()) + 'px'};
				
			props.passcodeElem.css('visibility', 'hidden').css('opacity', '1').css(vendor + 'Transform', 'translateY('+ $j(window).height() + 'px)').show();
			props.passcodeElem.addClass('passcodeTransition').css('visibility', '').css(vendor + 'TransitionProperty', '-' + vendor.toLowerCase() + '-transform');
			props.passcodeElem.css(vendor + 'Transform', 'translateY('+ cssTransform.top + ')');
		} else {
			props.passcodeElem.css('visibility', 'hidden');
			setTimeout(function() { alert('Please switch to portrait mode to enter the passcode.'); }, 0);
		}
	};
	
	var _displayPasscodeWidget = function() {
		
		var displayWidget = function () {
			var that = this;
			var cssTransform;
		
			var windowSmallDimension = Math.min(window.innerWidth, window.innerHeight);
			
			if ((/ipad/gi).test(navigator.platform) || windowSmallDimension > $j('#passcode table').outerHeight()) {
				
				props.passcodeElem.css('opacity', '0'); 
				_positionCenter();
				props.passcodeElem.addClass('passcodeTransition').css(vendor + 'TransitionProperty', 'opacity').css('opacity', '1');
				props.passcodeElem.orientationChange(_positionCenter);
			} else {
				props.passcodeElem.orientationChange(_positionForIphone);
				_positionForIphone();
			}
		};
		
		props.passcodeElem.css('opacity', '0').show(); // Need to unhide to calculate height/width
		setTimeout(displayWidget, 0);
	};
	
	var _hidePasscodeInput = function() {
		
		var cssTransform;
		
		var afterAnimate = function() { 
								props.passcodeElem.removeClass('passcodeTransition').css(vendor + 'TransitionProperty', 'none');
								props.passcodeElem.hide().unbind('webkitTransitionEnd');
								_destroy();
							}; 
		
		props.passcodeElem.bind('webkitTransitionEnd', afterAnimate);
		
		if (((/ipad/gi).test(navigator.platform)) || ($j(window).width() > ($j('#passcode table').outerWidth() + 50))) {
			cssTransform = {opacity:0};
			props.passcodeElem.addClass('passcodeTransition').css(vendor + 'TransitionProperty', 'opacity').css('opacity', '0');
		} else {
			cssTransform = {top: $j(window).height() + 'px'};
			props.passcodeElem.addClass('passcodeTransition').css(vendor + 'TransitionProperty', '-' + vendor.toLowerCase() + '-transform');
			props.passcodeElem.css(vendor + 'Transform', 'translateY('+ cssTransform.top + ')');
		}
		
		//props.passcodeElem.animate(cssTransform, { duration: 500, complete: afterAnimate });
	};
	
	var _initialize = function() {

		if (initialized === undefined) {
			var buttons = props.passcodeElem.find('table td.passcode_button');

			buttons.each(
				function() {
					var that = $j(this);
					var value = that.text();
					that.touch(
						function(e) {
							e.preventDefault(); e.stopPropagation();
							if (props.elemNum < 4) {
								$j(that).addClass('pressed');
								setTimeout( function() { $j(that).removeClass('pressed'); }, 100);
								_buttonClick(value);
								if (props.elemNum == 4 && props.callback) {
									props.callback(props.passcode);
								}
							}
						});
				});
			initialized = true;
		}
	};
	
	var _setup = function(callback) {
		props = {
			passcodeElem : $j('#passcode'),
			inputElems : $j('#passcode #passcode_input input'),
			elemNum : 0,
			passcode : '',
			callback : callback
		};
		_initialize();
		_setTitle(props.title);
		_reset();
	};
	
	var _reset = function() {
		_setTitle('Enter Passcode');
		_clearMsg();
		_clearPasscode();
	};
	
	var _clearPasscode = function() {
		props.elemNum = 0;
		props.passcode = '';
		props.inputElems.val('');
	};
	
	var _destroy = function() {
		if (props && props.passcodeElem)
			props.passcodeElem.unbindOrientationChange(_positionCenter);
		props = undefined;
	};
	
	var _setTitle = function(title) {
		$j('#passcode #passcode_title').html(title);
	};
	
	var _showMsg = function(msg, isError) {
		$j('#passcode #passcode_message').html(msg).show();
		if (isError)
			$j('#passcode #passcode_header').addClass('passcode_error');
	};
	
	var _clearMsg = function(msg) {
		$j('#passcode #passcode_message').empty().hide();
		$j('#passcode #passcode_header').removeClass('passcode_error');
	};

	var _buttonClick = function (elemVal) {
		var inpElem, domInpElem;
		
		if (elemVal == 'Logout' || elemVal == 'Cancel') {
			props.callback(-1);
		} else if (elemVal == 'Delete') {
			if (props.elemNum > 0) {
				props.inputElems[--props.elemNum].value = '';
				props.passcode = props.passcode.substr(0, props.elemNum);
			}
		} else if (parseInt(elemVal) >= 0) {
			props.inputElems[props.elemNum++].value = '.';
			props.passcode += elemVal;
		}
	};
	
	return {
		checkPasscode : function(validator, callback) { 

			var validate  = function(pass) { 
			
				var processResponse = function (resp, msg) {
					if (resp) { 
						_hidePasscodeInput();
						if(typeof callback == 'function') callback();
					} else {
						//display error
						_clearPasscode();
						if (msg) {
							_setTitle('Wrong Passcode');
							_showMsg(msg, true);
						}
					}
				}
				
				if (validator) {
					validator(pass, processResponse)
				}
			};
		
			_setup(validate);
			props.passcodeElem.find('#cancel').text('Logout');
			_displayPasscodeWidget();
		},
	
		setupPasscode : function(callback) {
			var temp;
			var validate = function(pass) {
				if (pass == -1) {
					_hidePasscodeInput();
					if(typeof callback == 'function') callback(-1);
				} else if (temp) {
					if  (temp == pass) {
						if(typeof callback == 'function') callback(props.passcode, _hidePasscodeInput);
					} else {
						temp = undefined;
						alert('Passcode didn\'t match. Please try again.');
						_reset();
					}
				} else {
					temp = pass;
					_setTitle('Re-enter the passcode');
					_clearPasscode();
				}
			};
	
			_setup(validate);
			_setTitle('Setup Passcode');
			props.passcodeElem.find('#cancel').text('Cancel');
			//props.passcodeElem('table #cancel').text('');
			_displayPasscodeWidget();
		}
	}
})();

