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

var sforce = window.sforce;

if (sforce === undefined) {
    sforce = {};
}

if (sforce.SplitView === undefined) {

    /**
     * The ListView provides a convenient wrapper for initializing and managing the list view 
     * UI component.
     * @param [listOptions] Options such as (onListSelect, onSearch, onItemSelect).
     * @constructor
     */
    sforce.SplitView = function() {
        var that = this;
        
        that.callbacks = $j.Callbacks();

        that._init();

    }
    
    sforce.SplitView.prototype = {
    
        _init : function() {
            var that = this;
            
            isPortrait = function() {
                return (window.innerHeight > window.innerWidth);
            }
            
            var setupContactListSection = function() {
                /*that.view.find('#header #searchbar input[type="search"]').attr('placeholder', 'Search All ' + contactPluralLabel);
                that.view.find('#header #listselect #owner').text('My ' + contactPluralLabel);
                that.view.find('#header #listselect #follow').text(contactPluralLabel + ' I Follow');
                if(!hasChatterEnabled) that.view.find('#header #listselect button#follow').hide();*/
                
                switch (isPortrait()) {
                    case true:
                        $j('#listpage').appendTo('#popover');
                        $j('#popover').css('visibility', 'hidden').css('opacity', '0').show();
                        $j('#contactlist_button').show().text(contactPluralLabel).touch(function() {
                            $j('#popover,#contactlist_button').windowTouch( 
                                                            function() { return false; }, 
                                                            function() { that.focusOutContactList(); return true; }, 
                                                            false);
                            $j('#popover').css('visibility', '').css('opacity', '1');
                        });
                        break;
                    case false:
                        $j('#popover').hide();
                        $j('#rightsection').before($j('#listpage'));
                        $j('#contactlist_button').hide().unbindTouch();
                        $j('#popover,#contactlist_button').unbindWindowTouch();
                        break;
                }
                
                that.callbacks.fire(isPortrait());
            }
            
            // Bloody android fires resize on keyboard display too.
            var resetContactList = function() {
                if ((isPortrait() && $j('#listpage').parent()[0].id != 'popover') 
                    || (!isPortrait() && $j('#listpage').parent()[0].id == 'popover')) {
                    setupContactListSection();
                }
            }
            
            $j(window).orientationChange(resetContactList);
            setupContactListSection();
            
        },
        
                
        //PUBLIC METHODS
        
        focusOutContactList: function () {
                
            switch (window.innerHeight > window.innerWidth) {
                case true:
                    var popover = $j('#popover');
                    var onHide = function() { 
                        popover.css('visibility', 'hidden').unbind('webkitTransitionEnd');
                    }
                    if (popover.css('opacity') != '0')  popover.bind('webkitTransitionEnd', onHide);
                    popover.css('opacity', '0');
                    $j('#popover,#contactlist_button').unbindWindowTouch();
                    break;
                default:
            }
        },
        
        addOrientationChangeCallback: function(callback) {
            if (typeof callback == 'function')
                this.callbacks.add(callback);
        },
        
        removeOrientationChangeCallback: function(callback) {
            if (typeof callback == 'function')
                this.callbacks.remove(callback);
        }
    }

}