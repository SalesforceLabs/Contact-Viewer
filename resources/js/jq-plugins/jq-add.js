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

var vendor = (/webkit/i).test(navigator.appVersion) ? 'webkit' :
        (/firefox/i).test(navigator.userAgent) ? 'Moz' :
        'opera' in window ? 'O' : '';
        
(function($) {

    var actInd;
    
    $.fn.changePage = function (to, reverse, callback) {
        var fromPage = this,
            toPage = (typeof to == 'object') ? to : $(to),
            parent = fromPage.parent(),
            parentWidth = parent.width(),
            onComplete, translateX;
            
        if (parent.is(toPage.parent())) {
            if (reverse) {
                parent.css('-webkit-transform', 'translate3d(' + (-1*parentWidth) + 'px, 0, 0)');
                fromPage.css('-webkit-transform', 'translate3d(' + parentWidth + 'px, 0, 0)');
                translateX = 0;
            } else {
                toPage.css('-webkit-transform', 'translate3d(' + parentWidth + 'px, 0, 0)');
                translateX = -1*parentWidth;
            }
            
            onComplete = function() {
                fromPage.css('visibility', 'hidden').css('-webkit-transform', 'translate3d(0, 0, 0)');
                parent.css('-webkit-transform', 'translate3d(0, 0, 0)');
                toPage.css('-webkit-transform', 'translate3d(0, 0, 0)');
                if (typeof callback == 'function') callback();
            }
            
            toPage.css('visibility', 'visible');
            parent.slide('translate3d(' + translateX + 'px, 0, 0)', onComplete);
        }
    };
    
    $.fn.scrollHeight = function() {
        return this[0].scrollHeight;
    };
    
    $.fn.slide = function(transform, callback) {
        var that = this,
            transProp = '-' + vendor.toLowerCase() + '-transform';
        
        var onComp = function(event) {
            if (that.is(event.target)) {
                that.removeClass('transitionSettings').css(vendor + 'TransitionProperty', 'none');
                that.unbind('webkitTransitionEnd'); 
                if(typeof callback == 'function') callback();
            }
        };
        this.unbind('webkitTransitionEnd').bind('webkitTransitionEnd', onComp);
        
        this.addClass('transitionSettings').css('visibility', 'visible');

        setTimeout(function() {
            that.css(vendor + 'TransitionProperty', transProp).css(vendor + 'Transform', transform); 
        }, 10);
    };
    
    $.fn.slideIn = function(axis, initialPos, finalPos, callback) {
        var that = this;
        
        var initialTransform, finalTransform;
        switch(axis.toUpperCase()) {
            case 'X': 
                initialTransform = 'translate3d(' + initialPos + 'px, 0px, 0px)';
                finalTransform = 'translate3d(' + finalPos  + 'px, 0px, 0px)';
                break;
            case 'Y': 
                initialTransform = 'translate3d(0px, ' + initialPos + 'px, 0px)';
                finalTransform = 'translate3d(0px, ' + finalPos  + 'px, 0px)';
                break;
        };

        this.css('visibility', 'hidden').css(vendor + 'TransitionProperty','none')
            .css(vendor + 'Transform', initialTransform);
            
        this.slide(finalTransform, callback);
    };
    
    $.fn.slideOut = function(axis, finalPos, callback){
        var that = this;
        
        var finalTransform;
        switch(axis.toUpperCase()) {
            case 'X': 
                finalTransform = 'translate3d(' + finalPos + 'px, 0px, 0px)';
                break;
            case 'Y': 
                finalTransform = 'translate3d(0px, ' + finalPos + 'px, 0px)';
                break;
        };
        
        var onComp = function() { 
            that.css('visibility', 'hidden'); 
            if(typeof callback == 'function') callback(); 
        };
        
        this.slide(finalTransform, onComp);
    };
    
    $.fn.slideInLeft = function(callback) {
                
        var leftPos = this.parent().width() - this.outerWidth(); // Element should be hidden before calculating width
        this.slideIn('X', this.parent().width(), leftPos, callback);
    };
    
    $.fn.slideOutRight = function(callback) {
                
        if (this.css('display') == 'block') {
            this.slideOut('X', this.parent().width(), callback);
        }   
    };
    
    $.fn.showActivityInd = function(displayText, addOverlay) {
        
        var overlay, that = this;
        if(addOverlay) overlay = this.addOverlay();
        
        if (actInd) actInd.hide().unbind();
        else {
            actInd = $('<div></div>').hide()
                    .append('<div id="spinner" style="position:relative; top:15px;"/>')
                    .append('<div id="text" style="margin: 45px 0 -5px 0;"/>');
            actInd.appendTo(document.body);
        }
        
        actInd[0].style.cssText = 'background-color:black; position: absolute; padding: 20px; color:white;' +
                                  '-webkit-border-radius: 10px; text-align: center; z-index:1000';
        
        actInd.children('#text').text(displayText || 'Loading...');
        
        var parentPos = this.offset();
        parentPos = (parentPos) ? parentPos : {left: 0, top: 0};
        var leftPos = parentPos.left + (this.width() - actInd.outerWidth(false))/2;
        var topPos = parentPos.top + (this.height() - actInd.outerHeight(false))/2;
        actInd.css('left', leftPos).css('top', topPos);
        
        actInd[0].style.cssText += ';-webkit-transition:-webkit-transform 100ms ease-out;';
        actInd.show().children('#spinner').spin('large', 'white');
        
        return {
            hide: function() {
                actInd.css('-webkit-transition-property', '-webkit-transform, opacity');
                actInd.bind('webkitTransitionEnd', function() { actInd.hide(); });
                actInd.css({webkitTransform: 'scale3d(0.5, 0.5, 1)', opacity: '0'});
                actInd.children('#spinner').spin(false);
                if(overlay) overlay.hide();
            }
        };
    };
    
    $.fn.addOverlay = function() {
        var that = this;
        
        var elemZIndex = $.topZIndex(that);
        
        var overlay = $('<div></div>').hide();
        overlay[0].style.cssText = 'background-color: black; border: none; opacity: 0.5; position: absolute; z-index:' + (elemZIndex + 10) + ';';
        
        overlay.css({width: that.width(), height: that.height()});
        overlay.appendTo(that).show().offset(that.offset());
        
        overlay.orientationChange(function () { 
            overlay.offset(that.offset()); 
            overlay.css({width: that.width(), height: that.height()});
        });

        return {
            elem: overlay,
            hide: function() {
                overlay.unbind('orientationchange').hide().remove();
            }
        };
    };
    
    $.fn.positionCenterOf = function(elem) {
        var topLoc = ($j(elem).height()/2 - this.outerHeight()/2);
        var leftLoc = ($j(elem).width()/2 - this.outerWidth()/2);
        
        this.offset({top: topLoc, left: leftLoc});
    };
    
    $.fn.orientationChange = function(listener) {
        if ((/AppleWebKit/i).test(navigator.appVersion) && "orientation" in window && "onorientationchange" in window) {
            this.bind('orientationchange', listener);
        } else {
            $j(window).resize(listener);
        }
        return this;
    };
    
    $.fn.unbindOrientationChange = function(listener) {
        if ((/AppleWebKit/i).test(navigator.appVersion) && window.onorientationchange) {
            this.unbind('orientationchange', listener);
        } else {
            $j(window).unbind('resize', listener);
        }
        return this;
    };
    
    $.fn.touch = function(listener) {
        if (window.Touch) this.bind('touchstart', listener);
        else this.bind('click', listener);
        return this;
    };
    
    $.fn.unbindTouch = function(listener) {
        if (window.Touch) this.unbind('touchstart', listener);
        else this.unbind('click', listener);
        return this;
    };
    
    $.fn.setText = function(text, autoTruncateLongText, fixedWidthElem) {
        this.text('');
        var elem = (fixedWidthElem || this);
        var initialWidth = elem.width();
        
        if (text == ' ') this.html('&nbsp;');
        else this.text(text); 
        
        var lastWidth = elem.width() + 1;
        
        while(autoTruncateLongText && text.length > 3 && elem.width() > initialWidth && elem.width() < lastWidth) {
            text = text.substring(0, Math.max(0, text.length - 4)) + '...';
            lastWidth = elem.width();
            this.text(text);
        }
        return this;
    };
    
    $.fn.windowTouch = function(onInsideTouch, onOutsideTouch, once) {
    
        var that = this;

        var touchDetect = function(e) {
        
            var theTarget = e.target,
                unbind = true;
                
            // Return if there is no associated touch handler
            if (!that.data('windowTouch')) return;
            
            if (theTarget.nodeType == 3) theTarget = theTarget.parentNode;
            
            if ($j(theTarget).is(that) || that.has(theTarget).length > 0) {
                if (typeof onInsideTouch == 'function') unbind = onInsideTouch(e);
            } else {
                if (typeof onOutsideTouch == 'function') unbind = onOutsideTouch(e);
            }
                
            if (once || unbind) that.unbindWindowTouch();
        }
        
        this.data('windowTouch', { handler : touchDetect });
        $j(window).touch(touchDetect);
        
        return this;
    };
    
    $.fn.unbindWindowTouch = function() {

        if (this.data('windowTouch')) {
            var evHandler = this.data('windowTouch').handler;
            this.removeData('windowTouch');
        
            if (evHandler) $j(window).unbindTouch(evHandler);
        }
        
        return this;
    };

    $.fn.textfill = function(options) {
        var fontSize = options.maxFontPixels;
        var textSpan = $('span:visible:first', this);
        var maxHeight = $(this).height();
        var maxWidth = $(this).width();
        var textHeight, textWidth;
        do {
            textSpan.css('font-size', fontSize);
            textHeight = textSpan.height();
            textWidth = textSpan.width();
            fontSize = fontSize - 1;
        } while ((textHeight > maxHeight || textWidth > maxWidth) && fontSize > 3);
        return this;
    };
    
})(jQuery);
