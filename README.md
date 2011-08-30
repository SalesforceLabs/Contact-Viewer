# Contact Viewer #

Contact Viewer is a free open-source app, available on any mobile or tablet device. It's the easiest way to browse your Contacts in any Salesforce environment, see all details, and read the latest chatter and activities related to them.

This document is intended to introduce you to the app's architecture and design and make it as easy as possible for you to jump in, run it, and start contributing.

Contact Viewer's source is [freely available on GitHub](https://github.com/ForceDotComLabs/Contact-Viewer).

In this document:

- Contact Viewer License
- External APIs
- Third-party Code

## Contact Viewer License ##

Copyright (c) 2011, salesforce.com, inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided 
that the following conditions are met:
 
- Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution. 
- Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## External APIs ##

Contact Viewer makes use of several external APIs.

- [Google Maps Javascript API V3](http://code.google.com/apis/maps/documentation/javascript/) allows geocoding of addresses on contacts and then plotting them on a map. 

Contact Viewer uses HTTPS when communicating with these APIs, so no user or account data should ever be traveling in the clear.

## Third-party Code ##

Contact Viewer makes use of a number of third-party components:

- [jQuery](http://jquery.com), the javascript library to make it easy to write javascript.
- [iScroll-4](http://cubiq.org/iscroll-4) for all the scrolling parts of the app.
- [add2home](http://cubiq.org/add-to-home-screen) shows a nice popup suggesting the addition of this webapp to home screen
- [jQuery-dateFormat](https://github.com/phstc/jquery-dateFormat), a modified version of original dateformat plugin to handle all dates and times.
- [jQuery-TopZIndex](http://topzindex.googlecode.com/) for setting/getting the right Z-Index of DOM elements.