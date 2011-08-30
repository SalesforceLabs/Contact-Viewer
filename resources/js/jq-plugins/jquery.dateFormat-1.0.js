/*
 * jQuery DateFormat plugin
 * Original Source: https://github.com/phstc/jquery-dateFormat
 *
 * Modified by: Akhilesh Gupta, salesforce.com <http://salesforce.com> , inc.
 */
 
(function ($) {
    $.format = (function () {
        function strDay(value) {
        	value = (typeof value.startsWith == 'function' && value.startsWith('0')) ? value.substring(1) : value;
            switch (parseInt(value)) {
            case 0:
                return "Sunday";
            case 1:
                return "Monday";
            case 2:
                return "Tuesday";
            case 3:
                return "Wednesday";
            case 4:
                return "Thursday";
            case 5:
                return "Friday";
            case 6:
                return "Saturday";
            default:
                return value;
            }
        }

        function strMonth(value) {
        	value = (typeof value.startsWith == 'function' && value.startsWith('0')) ? value.substring(1) : value;
            switch (parseInt(value)) {
            case 1:
                return "Jan";
            case 2:
                return "Feb";
            case 3:
                return "Mar";
            case 4:
                return "Apr";
            case 5:
                return "May";
            case 6:
                return "Jun";
            case 7:
                return "Jul";
            case 8:
                return "Aug";
            case 9:
                return "Sep";
            case 10:
                return "Oct";
            case 11:
                return "Nov";
            case 12:
                return "Dec";
            default:
                return value;
            }
        }

        var parseMonth = function (value) {
                switch (value) {
                case "Jan":
                    return "01";
                case "Feb":
                    return "02";
                case "Mar":
                    return "03";
                case "Apr":
                    return "04";
                case "May":
                    return "05";
                case "Jun":
                    return "06";
                case "Jul":
                    return "07";
                case "Aug":
                    return "08";
                case "Sep":
                    return "09";
                case "Oct":
                    return "10";
                case "Nov":
                    return "11";
                case "Dec":
                    return "12";
                default:
                    return value;
                }
            };

        var parseTime = function (value) {
                var retValue = value;
                var millis = "";
                if (retValue.indexOf(".") !== -1) {
                    var delimited = retValue.split('.');
                    retValue = delimited[0];
                    millis = delimited[1];
                }

                var values3 = retValue.split(":");

                if (values3.length === 3) {
                    hour = values3[0];
                    minute = values3[1];
                    second = values3[2];

                    return {
                        time: retValue,
                        hour: hour,
                        minute: minute,
                        second: second,
                        millis: millis
                    };
                } else {
                    return {
                        time: "",
                        hour: "",
                        minute: "",
                        second: "",
                        millis: ""
                    };
                }
            };
            
        var parseDateTime = function (value) {
        		var date = null;
                var year = null;
                var month = null;
                var dayOfMonth = null;
                var dayOfWeek = null;
            	var time = null; //json, time, hour, minute, second
                if (typeof value.getFullYear === "function") {
                    date = value;
                    time = parseTime(value.toTimeString());
                } else if (value.search(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d{0,3}\+\d{2}:?\d{2}/) != -1) { // 2009-04-19T16:11:05+02:00
                    var values = value.split(/[T\+-]/);
                    year = values[0];
                    month = values[1];
                    dayOfMonth = values[2];
                    time = parseTime(values[3].split(".")[0]);
                    date = new Date(year, month - 1, dayOfMonth);
                } else {
                    var values = value.split(" ");
                    switch (values.length) {
                    case 6:
                        //Wed Jan 13 10:43:41 CET 2010
                        year = values[5];
                        month = parseMonth(values[1]);
                        dayOfMonth = values[2];
                        time = parseTime(values[3]);
                        date = new Date(year, month - 1, dayOfMonth);
                        break;
                    case 1:
                        // Only Date: 2011-01-02
                    case 2:
                        //2009-12-18 10:54:50.546
                        var values2 = values[0].split("-");
                        year = values2[0];
                        month = values2[1];
                        dayOfMonth = values2[2];
                        time = (values.length == 2) ? parseTime(values[1]) : "";
                        date = new Date(year, month - 1, dayOfMonth);
                        break;
                    case 7:
                        // Tue Mar 01 2011 12:01:42 GMT-0800 (PST)
                    case 9:
                        //added by Larry, for Fri Apr 08 2011 00:00:00 GMT+0800 (China Standard Time)
                    case 10:
                        //added by Larry, for Fri Apr 08 2011 00:00:00 GMT+0200 (W. Europe Daylight Time)
                        year = values[3];
                        month = parseMonth(values[1]);
                        dayOfMonth = values[2];
                        time = parseTime(values[4]);
                        date = new Date(year, month - 1, dayOfMonth);
                        break;
                                /*
                                case 7: // Tue Mar 01 2011 12:01:42 GMT-0800 (PST)
                                year = values[3];
                                month = parseMonth(values[1]);
                                dayOfMonth = values[2];
                                time = parseTime(values[4]);
                                break;
                                                    */
                    default:
                    	return;
                    }
                }
                
                return {
                	date: date,
                	time: time
                }
        	};

        return {
        	toDate: function (value) {
        		var dateTime = parseDateTime(value);
        		
            	if (!dateTime || !dateTime.date) return null;
            	
            	var date = dateTime.date;
            	var time = dateTime.time;
            	
            	if (typeof time == 'object') {
	            	var dateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hour, time.minute, time.second, time.millis);
	            	if (dateTime.getMinutes()) {
	            		dateTime.setMinutes(dateTime.getMinutes() - dateTime.getTimezoneOffset());
	            	}
	            	return dateTime;
	            } 
	            	
	            return date;
        	},
        	
            date: function (value, format) {
                //value = new java.util.Date()
                //2009-12-18 10:54:50.546
                try {
                    
            		var dateTime = this.toDate(value);
            		if (!dateTime) return value;
            		
            		var year = dateTime.getFullYear();
                    var month = dateTime.getMonth() + 1;
                    var dayOfMonth = dateTime.getDate();
                    var dayOfWeek = dateTime.getDay();
                    var hour = dateTime.getHours();
                    var minute = dateTime.getMinutes();
                    var second = dateTime.getSeconds();
                    var millis = dateTime.getMilliseconds();
                    
                    var pattern = "";
                    var retValue = "";
                    //Issue 1 - variable scope issue in format.date 
                    //Thanks jakemonO
                    for (var i = 0; i < format.length; i++) {
                        var currentPattern = format.charAt(i);
                        pattern += currentPattern;
                        switch (pattern) {
                        case "ddd":
                            retValue += strDay(dayOfWeek);
                            pattern = "";
                            break;
                        case "dd":
                            if (format.charAt(i + 1) == "d") {
                                break;
                            }
                            if (String(dayOfMonth).length === 1) {
                                dayOfMonth = '0' + dayOfMonth;
                            }
                            retValue += dayOfMonth;
                            pattern = "";
                            break;
                        case "MMM":
                            retValue += strMonth(month);
                            pattern = "";
                            break;
                        case "MM":
                            if (format.charAt(i + 1) == "M") {
                                break;
                            }
                            if (String(month).length === 1) {
                                month = '0' + month;
                            }
                            retValue += month;
                            pattern = "";
                            break;
                        case "yyyy":
                            retValue += year;
                            pattern = "";
                            break;
                        case "HH":
                            retValue += hour;
                            pattern = "";
                            break;
                        case "hh":
                            //time.hour is "00" as string == is used instead of ===
                            retValue += (hour == 0 ? 12 : hour < 13 ? hour : hour - 12);
                            pattern = "";
                            break;
                        case "mm":
                            retValue += ((minute < 10) ? '0' + minute : minute);
                            pattern = "";
                            break;
                        case "ss":
                            //ensure only seconds are added to the return string
                            retValue += ('' + second).substring(0, 2);
                            pattern = "";
                            break;
                            //case "tz":
                            //    //parse out the timezone information
                            //    retValue += time.second.substring(3, time.second.length);
                            //    pattern = "";
                            //    break;
                        case "SSS":
                            retValue += ('' + millis).substring(0, 3);
                            pattern = "";
                            break;
                        case "a":
                            retValue += hour >= 12 ? "PM" : "AM";
                            pattern = "";
                            break;
                        case " ":
                            retValue += currentPattern;
                            pattern = "";
                            break;
                        case "/":
                            retValue += currentPattern;
                            pattern = "";
                            break;
                        case ":":
                            retValue += currentPattern;
                            pattern = "";
                            break;
                        case "(":
                        	while(format.charAt(++i) != ')') {
                        		retValue += format.charAt(i);
                        	}
                        	pattern = "";
                            break;
                        default:
                            if (pattern.length === 2 && pattern.indexOf("y") !== 0 && pattern != "SS") {
                                retValue += pattern.substring(0, 1);
                                pattern = pattern.substring(1, 2);
                            } else if ((pattern.length === 3 && pattern.indexOf("yyy") === -1)) {
                                pattern = "";
                            }
                        }
                    }
                    return retValue;
                } catch (e) {
                    console.log(e);
                    return value;
                }
            }
        };
    }());
}(jQuery));
