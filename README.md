# Contact Viewer #

Contact Viewer is a free open-source app, available on any mobile or tablet device. It's the easiest way to browse your Contacts in any Salesforce environment, see all details, and read the latest chatter and activities related to them.

This document is intended to introduce you to the app's architecture and design and make it as easy as possible for you to jump in, run it, and start contributing.

Contact Viewer's source is [freely available on GitHub](https://github.com/ForceDotComLabs/Contact-Viewer).

In this document:

- Contact Viewer License
- Installation Steps
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

## Installation Steps ##

1. Grab the Contact Viewer source code: `git clone https://github.com/ForceDotComLabs/Contact-Viewer.git`
2. Deploy the force.com metadata under Contact-Viewer/src folder to your destination org. You can deploy that using [Force.com Migration Tool](http://wiki.developerforce.com/index.php/Force.com_Migration_Tool) or by using [Force.com IDE](http://wiki.developerforce.com/index.php/Force.com_IDE)
3. Login into your destination org and setup following:
    1. Force.com sites: Under Setup -> Develop -> Sites, setup a domain name and create a new site. Use the **ContactsApp** as the Active site home page. Also enable all the Visualforce pages, which are part of this project, on this new site.
    2. Remote access: Under Setup -> Develop -> Remote Access, create new remote access settings with **Callback URL** as the URL of the site created in step 3(1).
    3. Custom setting defaults: Under Setup -> Develop -> Custom Settings, click Manage for **Contacts App Settings** and add the following data:
        - Name: **Defaults**
        - Encryption Key: Generate a private key using apex. Go to system log and exceute the following code: `System.debug(EncodingUtil.base64Encode(Crypto.generateAesKey(128)));`. Copy the debug output as the value for this field.
        - OAuth Client Id: Copy the **Consumer Key** from **Remote Access** settings created in step 3(2).
        - OAuth Client Redirect URI: Copy the **Callback URL** from **Remote Access** settings created in step 3(2).
        - OAuth Client Secret: Copy the **Consumer Secret** from **Remote Access** settings created in step 3(2).
    4. Lastly, you need to whitelist the instance URL on which your users will live. You can add that whitelist from Setup -> Security Controls -> Remote Site Settings

You should now be all set and ready to use the app! To start using your newly deployed app, navigate to the sites URL created in step 3(1) from any webkit based browser.

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