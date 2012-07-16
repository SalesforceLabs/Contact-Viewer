/*! 
 * Localytics HTML5/JavaScript Library
 * Copyright (C) 2009 Char Software Inc., DBA Localytics
 * 
 * This code is provided under the Localytics Modified BSD License.
 * A copy of this license is available at
 * http://www.localytics.com/docs/opensourceinfo/#license-documentation
 * 
 * Please visit www.localytics.com for more information.
 */
var localyticsSession = (function () {
  var CALLBACK_METHOD = "localyticsSession.__callback__";
  var LIB_VERSION = "html5_2.0";
  var MAX_UPLOAD_LENGTH = 64000;
  var PUBLIC_METHODS = ['init', 'open', 'close', 'tagEvent', 'tagScreen', 'tagEvent', 'upload'];

  // User-customizable configuration variables
  var appKey;
  var sessionTimeoutSeconds = 30;
  var closePollingTimeout = 10000;
  var uploadTimeout = 60000;
  var logger = false;
  var appVersion;
  var networkCarrier;
  /*
    LocalStorage Experimental Limitations:
      linux/chromium: 2,621,436 characters
      linux/ff: 5,242,876 characters
      iOS/Mobile-Safari: 2,600,000-2,700,000

      Max uploadable size is device/browser/server dependent, but on the order of
    60k characters (URI encoded). Complete sessions plus a couple of events run
    between 1-2k characters.  While we could store upwards of 2.6M chars safely,
    for that much data to be stored would mean other limits were being surpassed.
   */
  var maxLocalStorageSize = 100000;

  // Global object that gets returned, ie 'localyticsSession'
  var ref = {};

  // Constants used for storage buckets
  var INSTALL_UUID               = "__ll_iu";
  var EVENT_STORE               = "__ll_es";
  var CURRENT_HEADER            = "__ll_ch";
  var DEVICE_BIRTH_TIME         = "__ll_pa";
  var CURRENT_SESSION_UUID      = "__ll_csu";
  var CURRENT_SESSION_OPEN_TIME = "__ll_cst";
  var CURRENT_SESSION_INDEX     = "__ll_csi";
  var CURRENT_SEQUENCE_INDEX    = "__ll_csq";
  var CURRENT_SESSION_IS_OPEN   = "__ll_cso";
  var UPLOAD_BUCKET             = "__ll_ub";
  var LAST_OPEN_TIME            = "__ll_lot";
  var LAST_CLOSE_TIME           = "__ll_lct";
  var CHARS_STORED              = "__ll_chs";
  var SCREEN_FLOWS              = "__ll_fl";

  var LOCALYTICS_CONSTANTS = [
    INSTALL_UUID,
    EVENT_STORE,
    CURRENT_HEADER,
    DEVICE_BIRTH_TIME,
    CURRENT_SESSION_UUID,
    CURRENT_SESSION_OPEN_TIME,
    CURRENT_SESSION_INDEX,
    CURRENT_SEQUENCE_INDEX,
    CURRENT_SESSION_IS_OPEN,
    UPLOAD_BUCKET,
    LAST_CLOSE_TIME,
    CHARS_STORED,
    SCREEN_FLOWS
  ];

  var SCRIPT_LOADED_PATTERN = /loaded|complete/;

  // Memory storage, declared here for scope across helper methods
  var installUUID;
  var eventStore;
  var currentHeader;
  var deviceBirthTime;
  var currentSessionUUID;
  var currentSessionOpenTime;
  var currentSessionIndex;
  var currentSequenceIndex;
  var currentSessionIsOpen;
  var uploadBucket;
  var lastCloseTime;
  var lastOpenTimeSeconds;
  var charsStored;
  var screenFlows;

  var pollReference;
  var uploadTime = [];
  var storage;

  var logFn = function(o) { console.log(o); };
  var emptyFn = function(o) { return; }
  var log = emptyFn;

  // Add fallback for lack of console.log
  if (typeof(console) === "undefined") {
    console = {};
  }

  if (console.log === undefined) {
    console.log = function() {};
  }

  // Add ability to switch logging on the fly
  ref._switchLogger = function(on) {
    log = on ? logFn : emptyFn;
  };

  try {
    if (localStorage.getItem) {
      storage = window.localStorage;
    }
  } catch(e) {
    log("Local Storage not supported!");
  }

  // TODO: Wrap this
  var userAgent = navigator.userAgent;

  ref._getStore = function (key, parseJSON) {
    if (storage) {
      var ls = storage.getItem(key),
        store;
      if (ls != null) {
        try {
          if (parseJSON) {
            store = JSON.parse(ls);
          } else {
            store = ls;
          }
        } catch (err) {
          log("Error parsing JSON from localStorage." + key);
        }
      }
      return store;
    }
  };

  /**
   * For safely and accurately recording the number of chars Localytics has claimed
   * @param count Number of characters stored, not including changes to this value itself
   * @return modifiedCount Either the adjusted count value, or undefined if the write fails
   */
  var writeCount = function (count) {
    var oldLen = (ref._getStore(CHARS_STORED, false) || "").length;
    var newLen = ("" + count).length;
    var delta = newLen - oldLen;
    count += delta;
    try {
      storage.setItem(CHARS_STORED, count);
      charsStored = count;
      return count;
    } catch(e) {
      return undefined;
    }
  };

  var initStore = function () {
    charsStored = generateCurrentStorageSize();
    writeCount(charsStored);
  };

  ref._writeStore = function (key, o) {
    if (storage) {
      var oldSize,
        newSize,
        delta,
        jsonStr,
        curChars;
      if (charsStored === undefined) {
        charsStored = ref._getStore(CHARS_STORED, true);
        if (!charsStored) {
          initStore();
        }
      }
      oldSize = ref._getStore(key, false);
      oldSize = oldSize ? oldSize.length : 0;
      try {
        if (o == null) {
          writeCount(charsStored - oldSize);
          storage.removeItem(key);
        } else {
          jsonStr = JSON.stringify(o);
          newSize = jsonStr.length;
          delta = newSize - oldSize;
          if (delta) {
            curChars = charsStored + delta;
            if (delta < 0) {
              if (writeCount(curChars) !== undefined) {
                storage.setItem(key, jsonStr);
              } else {
                log("Write aborted: delta was negative, but unable to update storage");
                return undefined;
              }
            } else {
              curChars += ("" + curChars).length - ("" + charsStored).length
              if (curChars < maxLocalStorageSize && (writeCount(curChars) !== undefined)) {
                storage.setItem(key, jsonStr);
              } else {
                log("Write aborted: writing would exceed storage limits");
                return undefined;
              }
            }
          } else {
            // Delta == 0, no need to update charsStored
            storage.setItem(key, jsonStr);
          }
        }
        return o;
      } catch(e) {
        log("Write to localStorage failed by exception.");
        return undefined;
      }
    }
  };

  var appendToStore = function (o) {
    if (!eventStore) {
    log("No event store found, searching localStorage");
      eventStore = ref._getStore(EVENT_STORE, true);
      if (!eventStore) {
        log("No event storage in localStorage found, creating an empty array");
        eventStore = [];
      }
    }
    log("Pushing event to event store");
    eventStore.push(o);
    ref._writeStore(EVENT_STORE, eventStore);
  };

  ref._send = function (jsonData) {
    var script = document.createElement("script"),
      head = document.head || document.getElementsByTagName("head")[0] || document.documentElement,
      src = ref.__url__ + "api/v2/applications/" + encodeURIComponent(appKey) + "/uploads?callback=" + CALLBACK_METHOD + "&client_date=" + (new Date().getTime()) + "&data=" + encodeURIComponent(jsonData);

    log("Uploading blob: \n" + jsonData);
    log("Request length: " + src.length);
    if (src.length > MAX_UPLOAD_LENGTH) {
      log("Upload length exceeds maximum supported length.  Deleting data without uploading.");
      ref._clearStoredUploads();
      return;
    }
    script.async = "async";
    // _=[timestamp] is to avoid caching
    script.src = src;
    script.onload = function () {
      if (!script.readyState || SCRIPT_LOADED_PATTERN.test(script.readyState)) {
        log("Unloading script tag from header");
        // Remove script element to avoid leaking memory
        script.onload = null;
        if (head && script.parentNode) {
          head.removeChild(script);
        }
        script = undefined;
      }
    };
    head.insertBefore(script, head.firstChild);
  };

  var generateCurrentStorageSize = function () {
    var i,
      len,
      sum = 0,
      store;
    for (i = 0, len = LOCALYTICS_CONSTANTS.length; i < len; i += 1) {
      store = ref._getStore(LOCALYTICS_CONSTANTS[i], false);
      if (store && store.length) {
        sum += store.length;
      }
    }
    return sum;
  };

  var generateUUID = function () {
    // TODO: This method does not generate real UUIDs to spec
    // see: http://www.rfc-archive.org/getrfc.php?rfc=4122 section 4.4
    var s4 = function () {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
  };

  var generateClientTime = function () {
    return (new Date()).getTime() / 1000 | 0;
  };

  var generateClientTimeInMillis = function () {
    return (new Date()).getTime();
  };

  var generateFalse = function () {
    return false;
  };

  var generateArray = function () {
    return [];
  };

  var generateString = function () {
    return "";
  };

  var generateZero = function () {
    return 0;
  };

  /**
   * Wrapper for accessing properties, from persistent storage if necessary
   * @param property Property to be checked before reading from disk.  Note that
   * unless this an object that gets passed by reference, it must be set
   * outside.
   *
   * EG: <pre>prop = getOrCreateProperty(prop, k, g, 0)</pre>
   * @param key Key for storing the object to disk
   * @param generator Function which generates a new property if necessary
   * @param clear Truthiness of value provides override for generating a new property
   */
  ref._getOrCreateProperty = function (property, key, generator, clear) {
    // TODO: If we know these properties are strings or numbers, it's wasteful to stringify them
    if (clear) {
      property = generator();
      ref._writeStore(key, property);
    } else if (property == null) {
      property = ref._getStore(key, true);
      if (!property) {
        property = generator();
        ref._writeStore(key, property);
      }
    }
    return property;
  };

  var getInstallUUID = function () {
    // TODO: Hash app uuid as part of device id
    installUUID = ref._getOrCreateProperty(installUUID, INSTALL_UUID, generateUUID, false);
    return installUUID;
  };

  var getCurrentSessionUUID = function (clear) {
    currentSessionUUID = ref._getOrCreateProperty(currentSessionUUID, CURRENT_SESSION_UUID, generateUUID, clear);
    return currentSessionUUID;
  };

  var getCurrentSessionOpenTime = function (clear) {
    currentSessionOpenTime = ref._getOrCreateProperty(currentSessionOpenTime, CURRENT_SESSION_OPEN_TIME, generateClientTime, clear);
    return currentSessionOpenTime;
  };

  var getBirthDate = function () {
    deviceBirthTime = ref._getOrCreateProperty(deviceBirthTime, DEVICE_BIRTH_TIME, generateClientTime, false);
    return deviceBirthTime;
  };

  ref._getSessionIndex = function () {
    currentSessionIndex = ref._getOrCreateProperty(currentSessionIndex, CURRENT_SESSION_INDEX, generateZero, false);
    return currentSessionIndex;
  };

  var incrementCurrentSessionIndex = function () {
    ref._getSessionIndex();
    currentSessionIndex += 1;
    ref._writeStore(CURRENT_SESSION_INDEX, currentSessionIndex);
    return currentSessionIndex;
  };

  var getAndIncrementSequenceNum = function () {
    currentSequenceIndex = ref._getOrCreateProperty(currentSequenceIndex, CURRENT_SEQUENCE_INDEX, generateZero, false);
    currentSequenceIndex += 1;
    ref._writeStore(CURRENT_SEQUENCE_INDEX, currentSequenceIndex);
    return currentSequenceIndex;
  };

  var getCurrentSessionIsOpen = function () {
    currentSessionIsOpen = ref._getOrCreateProperty(currentSessionIsOpen, CURRENT_SESSION_IS_OPEN, generateFalse, false);
    return currentSessionIsOpen;
  };

  ref._getOSVersion = function(userAgent) {
    var parts = userAgent.split(/[)]?\s[(]?/),
      i, j, k, result, matched, major, minor, len = parts.length, os = parts[1];

    if (userAgent.match(/iPhone|iPad|iPod/)) {
      matched = userAgent.match(/OS (\d+)\D(\d+)/);
      if (matched && matched.length === 3) {
        result = 'iOS ' + matched[1] + '.' + matched[2];
      }
    } else if (os && os.match(/Macintosh/)) {
      for (i = 2; i < len; i++) {
        if (parts[i] == 'OS') {
          var start = i - 1, end = i + 2;  // decent defaults

          // find start
          for (j = i - 1; j > 1; j--) {
            if (parts[j].substr(-1) === ';' || parts[j] === 'Intel' || parts[j] === 'CPU') {
              start = j + 1;
              break;
            }
          }

          // find end
          for (j = i + 1; j < i + 4; j++) {
            if (parts[j].substr(-1) === ';') {
              end = j;
              break;
            } else if (parts[j] === 'like') {
              end = j - 1;
              break;
            }
          }

          result = parts.splice(start, end - (start - 1)).join(' ');
          result = result.replace(';', '').replace('_', '.').replace(/_\d$/, '').replace('Mac ', '');

          break;
        }
      }
    } else if (/^Android/.test(parts[3])) {
      result = (parts[3] + ' ' + parts[4]).replace(';', '');

    } else if (matched = userAgent.match(/Windows NT (\d)\.(\d)/)) {
      if (matched.length > 2) {
        major = matched[1];
        minor = matched[2];

        if (major === '6' && minor === '2') {
          result = 'Windows 8'
        } else if (major === '6' && minor === '1') {
          result = 'Windows 7'
        } else if (major === '6' && minor === '0') {
          result = 'Windows Vista'
        } else if (major === '5' && minor === '1') {
          result = 'Windows XP'
        } else if (major === '5' && minor === '0') {
          result = 'Windows 2000'
        } else if (major === '5' && minor === '2') {
          result = 'Windows Server 2003'
        }
      }
    } else if (userAgent.match(/SymbOS/)) {
      result = 'SymbOS'

    } else if (userAgent.match(/BlackBerry/) && (matched = userAgent.match(/Version\/(\d+)\./))) {
      result = 'BlackBerry ' + matched[1];
    }


    return result
  };

  ref._generateHeader = function () {
    log("Generating a new header");
    var language = (navigator.language || navigator.userLanguage || '').toUpperCase();
    var country;
    if (language && language.match(/-/)) {
      var parts = language.split(/-/);
      language = parts[0];
      country = parts[1];
    } else {
      country = userAgent.match(new RegExp("^.*?\\(.*?" + language + "-(\\w\\w).*?\\).*?$", 'i'))[1];
    }

    var devicePlatform = navigator.platform, // TODO: iPad displays iPad, not iOS, etc
      deviceMake = navigator.vendor, // Only valid for iOS devices
      deviceModel = navigator.platform, // TODO: No version number included
      header = {
        "dt": "h",
        "pa": getBirthDate(),
        "seq": getAndIncrementSequenceNum(),
        "u": generateUUID()
      },
      attrs = {
        "dt": "a",
        "au": appKey,
        "iu": getInstallUUID(),
        "lv": LIB_VERSION,
        "ua": userAgent
      };


    if (deviceModel) {
      attrs.dmo = deviceModel;
    }

    if (devicePlatform) {
      attrs.dp = devicePlatform;
    }

    if (language) {
      attrs.dll = language;
    }

    var osVersion = ref._getOSVersion(userAgent);
    if (osVersion) {
      attrs.dov = osVersion;
    }
    if (appVersion) {
      attrs.av = appVersion;
    }
    if (networkCarrier) {
      attrs.nc = networkCarrier;
    }
    if (country) {
      attrs.dc = country.toUpperCase();
    }
    if (deviceMake) {
      attrs.dma = deviceMake;
    }

    header.attrs = attrs;

    return header;
  };

  var getHeader = function (clear) {
    currentHeader = ref._getOrCreateProperty(currentHeader, CURRENT_HEADER, ref._generateHeader, clear);
    return currentHeader;
  };

  var beginPollingForCloses = function () {
    if (!pollReference) {
      log("Beginning to poll for closes");
      pollReference = window.setTimeout(pollForCloses, closePollingTimeout);
    } else {
      log("Already polling.");
    }
  };

  var stopPollingForCloses = function () {
    if (pollReference) {
      log("Stopping close polling");
      window.clearTimeout(pollReference);
      pollReference = null;
    } else {
      log("No polling to stop");
    }
  };

  var pollForCloses = function () {
    ref._markNewClose();
    pollReference = window.setTimeout(pollForCloses, closePollingTimeout);
  };

  ref._markNewClose = function () {
    log("Marking a new close.");
    lastCloseTime = (new Date()).getTime();
    return ref._writeStore(LAST_CLOSE_TIME, lastCloseTime);
  };

  var generateClose = function () {
    lastCloseTime = ref._getOrCreateProperty(lastCloseTime, LAST_CLOSE_TIME, generateClientTimeInMillis, false);
    screenFlows = ref._getOrCreateProperty(screenFlows, SCREEN_FLOWS, generateArray, false);
    var closeTime = (lastCloseTime / 1000) | 0;
    var openTime = getCurrentSessionOpenTime();
    var sessionLength = closeTime - openTime;
    var closeJSON = {
      "dt": "c",
      "u": generateUUID(),
      "ss": openTime,
      "su": getCurrentSessionUUID(),
      "ct": closeTime,
      "ctl": sessionLength,
      "cta": sessionLength // (inaccurate, optional)
    };
    if (screenFlows.length > 0) {
      closeJSON.fl = screenFlows
    }
    return closeJSON;
  };

  var finalizeClose = function () {
    log("Finalizing close with last polled close");
    stopPollingForCloses();
    appendToStore(generateClose());
    screenFlows = [];
    ref._writeStore(SCREEN_FLOWS, screenFlows);
    ref._writeStore(CURRENT_SESSION_IS_OPEN, false);
  };

  ref._clearStoredUploads = function () {
    uploadBucket = null;
    ref._writeStore(UPLOAD_BUCKET, uploadBucket);
  };

  /**
   * Set LocalyticsApplication UUID and default options
   * @param app_uuid UUID received through the Localytics Web Interface
   * @param options Options hash containing additional configuration defaults
   */
  ref._init = function (app_uuid, options) {
    appKey = app_uuid;
    if (options) {
      // Additional options here: polling time, upload defaults, etc.
      if (options.polling != null) {
        // Catch 0, false, NaN
        if (!options.polling) {
          closePollingTimeout = 0;
        } else {
          closePollingTimeout = +options.polling;
        }
      }

      if (options.uploadTimeout) {
        uploadTimeout = options.uploadTimeout;
      }

      if (options.version) {
        appVersion = "" + options.version;
      }
      if (options.carrier) {
        networkCarrier = "" + options.carrier;
      }
      if (options.sessionTimeoutSeconds != null) {
        if (!options.sessionTimeoutSeconds ) {
          sessionTimeoutSeconds = 0;
        } else {
          sessionTimeoutSeconds = +options.sessionTimeoutSeconds;
        }

      // Doing this to maintain backwards compatibility.  The timeout option has been replaced by sesionTimeoutSeconds and will not be supported in the future.
      } else if (options.timeout != null) {
        if (!options.timeout ) {
          sessionTimeoutSeconds = 0;
        } else {
          sessionTimeoutSeconds = (+options.timeout) / 1000;
        }
      }

      if (options.storage != null) {
        if (!options.storage) {
          maxLocalStorageSize = 0;
        } else {
          maxLocalStorageSize = +options.storage;
        }
      }
      if (options.logger != null) {
        logger = !!options.logger;
      }

      ref._switchLogger(logger);
    }
    initStore();
    // TODO: If header has changed, append current header with event store to a new upload body
    getHeader(true);
    log("LocalyticsSession successfully initialized");
  };

  /**
   * Opens the Localytics session.  This must be called before
   * {@link localyticsSession.tagEvent()} or {@link localyticsSession.tagScreen()}
   */
  ref._open = function () {
    var openObject;

    lastCloseTime = ref._getStore(LAST_CLOSE_TIME, true) || 0;
    if (((new Date()).getTime() - lastCloseTime) < (1000 * sessionTimeoutSeconds)) {
      log("Open called within timeout, resuming last session.");
    } else {
      if (getCurrentSessionIsOpen()) {
        finalizeClose();
      }
      incrementCurrentSessionIndex();

      var sessionOpenTimeSeconds = getCurrentSessionOpenTime(true);
      openObject = {
        "dt": "s",
        "ct": sessionOpenTimeSeconds,
        "u": getCurrentSessionUUID(true),
        "nth": ref._getSessionIndex()
      };

      lastOpenTimeSeconds  = lastOpenTimeSeconds || ref._getStore(LAST_OPEN_TIME, true) || 0;

      if (lastOpenTimeSeconds && lastOpenTimeSeconds != 0) {
        var timeSinceLastOpen = sessionOpenTimeSeconds - lastOpenTimeSeconds;
        if (timeSinceLastOpen >= 1) {
          openObject['sl'] = Math.round(timeSinceLastOpen);
        }
      }

      lastOpenTimeSeconds = ref._writeStore(LAST_OPEN_TIME, sessionOpenTimeSeconds)


      appendToStore(openObject);
      currentSessionIsOpen = true;
      ref._writeStore(CURRENT_SESSION_IS_OPEN, currentSessionIsOpen);
      log("Appended open tag to event store");
    }
    // Initiate close polling
    if (closePollingTimeout) {
      beginPollingForCloses();
    } else {
      log("Polling timeout was set to 0; no close polling will be done.");
    }

  };

  /**
   * Allows a session to tag a particular event as having occurred. Note that
   * this method coerces eventName and the attributes' values to strings.
   * @param eventName Name of the event
   * @param attributes (Optional) A non-nested, associative array of key-value
   * pairs. All values will be coerced to strings
   */
  ref._tagEvent = function (eventName, attributes) {
    if (!getCurrentSessionIsOpen()) {
      log("Cannot tag event: either no session was opened, or it was already closed");
      return;
    }
    var s, ea;
    var eventObject = {
      "dt": "e",
      "ct": generateClientTime(),
      "u": generateUUID(),
      "su": getCurrentSessionUUID(),
      "n": "" + eventName
    };

    if (attributes) {
      ea = {};
      // Rebuild attribute hash, coercing values to strings
      for (s in attributes) {
        if (attributes.hasOwnProperty(s)) {
          ea[s] = "" + attributes[s];
        }
      }
      eventObject.attrs = ea;
    }
    appendToStore(eventObject);
    log("Tagged event: '" + eventName + "' with attributes (JSON): '" + JSON.stringify(ea) + "'");
  };

  ref._tagScreen = function (screenName) {
    if (!getCurrentSessionIsOpen()) {
      log("Cannot tag screen: either no session was opened, or it was already closed");
      return;
    }
    screenFlows = ref._getOrCreateProperty(screenFlows, SCREEN_FLOWS, generateArray, false);
    var len = screenFlows.length || 0;
    var name = "" + screenName;
    if (screenFlows[len - 1] !== name) {
      screenFlows.push(name);
      ref._writeStore(SCREEN_FLOWS, screenFlows);
    }
  };

  /**
   * Marks a new close time and stops polling for new closes.  Note that this
   * method does not guarantee a close event: a {@link localyticsSession.open()}
   * event called within the session timeout will resume this session, so this
   * is safe to call when transitioning from one page context to another (where
   * open must be called).
   */
  ref._close = function () {
    if (!getCurrentSessionIsOpen()) {
      log("Cannot close session: either no session was opened, or it was already closed");
      return;
    }
    stopPollingForCloses();
    ref._markNewClose();
  };

  /**
   * Initiates an upload of any stored Localytics data using this session's API
   * key. The upload uses the JSONP method, which temporarily inserts a script
   * tag into the header in order to make the request and parse the JSON response.
   */
  ref._upload = function () {
    if (uploadTime.length > 0) {

      if ((new Date().getTime() - uploadTime[0]) > uploadTimeout) {
        console.log("Upload in progress, returning");
        return;
      } else {
        // Old, uncompleted upload. Remove it from queue
        uploadTime = [];
      }
    }
    eventStore = ref._getOrCreateProperty(eventStore, EVENT_STORE, generateArray, false);
    uploadBucket = ref._getOrCreateProperty(uploadBucket, UPLOAD_BUCKET, generateString, false);
    if ((!eventStore || eventStore.length === 0) && !uploadBucket) {
      log("Nothing to upload, returning.");
      return;
    }

    var uploadObjects = eventStore.splice(0);
    var blob = "";
    var i;
    var len;
    uploadObjects.unshift(getHeader(false));
    // Do the work of appending all the event data to the end of any existing upload data
    for (i = 0, len = uploadObjects.length; i < len; i += 1) {
      blob += JSON.stringify(uploadObjects[i]) + '\n';
    }
    uploadBucket += blob;
    ref._writeStore(UPLOAD_BUCKET, uploadBucket);
    eventStore = null;
    ref._writeStore(EVENT_STORE, eventStore);
    // Send the blob via get/JSONP
    ref._send(uploadBucket);
    // Create a new header
    getHeader(true);
  };

  ref.__callback__ = function (response) {
    var rc = +response.response_code;
    uploadTime = [];
    log("Callback called with response:");
    if (rc) {
      log("Response code: " + rc);
      if (rc === 202 || rc === 200) {
        // 4. On success, clear uploaded blobs
        log("Upload succeeded, clearing uploaded items.");
        ref._clearStoredUploads();
      } else if (rc >= 400 && rc > 500) {
        log("Response was 4XX, clearing items");
        ref._clearStoredUploads();
      }
    }
  };

  ref.__url__ = "//analytics.localytics.com/";

  var fallBackToSafe = function(fnName, e) {
    console.log("> Call to Localytics client library failed .");
    console.log("> localyticsSession." + fnName + " failed .");
    console.log("> " + e);
    console.log(e);
    for (var fnName in PUBLIC_METHODS) {
      ref[fnName] = emptyFn;
    }
  };

  // set public methods
  (function() {
    var i, fnName, len = PUBLIC_METHODS.length;

    for (i = 0; i < len; i++) {
      fnName = PUBLIC_METHODS[i];

      ref[fnName] = (function(fn) {

        return function() {
          try {
            ref['_' + fn].apply(ref, arguments)
          } catch(e) {
            fallBackToSafe(fn, e);
          }
        };
      })(fnName);
    }

  })();

  return ref;
})();

