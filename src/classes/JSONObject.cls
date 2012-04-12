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

public with sharing class JSONObject {

    private Map<Integer, String> subs;
    private Map<String, String> jsonValueMap;
    
    private String value;
    private String[] arrayValues;
    
    private JSONObject() {
        this.subs = new Map<Integer, String>();
    }
    
    private JSONObject(Map<Integer, String> subs, Map<String, String> jsonValueMap) {
        this.subs = subs;
        this.jsonValueMap = jsonValueMap;
    }
    
    private JSONObject(String val) {
        this.value = val;
    }
    
    private JSONObject(Map<Integer, String> subs, String[] values) {
        this.arrayValues = values;
    }
    
    public static String createSimpleJson(Map<String, String> keyValueMap) {
        
        String json = '{';
        
        for (String key : keyValueMap.keySet()) {
            json += '"' + key + '":"' + keyValueMap.get(key) + '",';
        }
        
        json = json.subString(0, json.length()-1) + '}';
        
        return json;   
    }
    
    public static Map<String, String> parseSimpleJson(String jsonStr) {
        
        Pattern jsonPattern = Pattern.compile('\\s*"([^"]+?)"\\s*:\\s*("[^"]*?"|[a-zA-Z0-9]+|\\$[0-9]+\\$|\\[[\\$0-9,]*\\])\\s*[,\\}]');
        Matcher respMatcher = jsonPattern.matcher(jsonStr);
        
        Map<String, String> jsonMap = new Map<String, String>();
        
        while (respMatcher.find()) {
            if (respMatcher.groupCount() == 2) {
                String val = respMatcher.group(2);
                val = ('null'.equals(val) ? null : val.replaceFirst('"(.*)"', '$1'));
                jsonMap.put(respMatcher.group(1), val);
            }
        }
        
        return jsonMap;   
    }
    
    public static JSONObject newInstance(String jsonStr) {
        
        if (jsonStr == null) return null;
        
        Integer idx = 0;
        
        JSONObject obj = new JSONObject();
        
        Pattern jsonPattern = Pattern.compile('\\{[^\\{\\}]*\\}');
        Matcher jsonMatcher = jsonPattern.matcher(jsonStr);
        
        while (!jsonMatcher.matches()) {
            while (jsonMatcher.find()) {
                Integer startLoc = jsonMatcher.start();
                Integer endLoc = jsonMatcher.end();
                obj.subs.put(idx, jsonStr.substring(startLoc, endLoc));
                jsonStr = jsonStr.substring(0, startLoc)  + '$'+ idx++ + '$' + jsonStr.substring(endLoc);
                jsonMatcher.reset(jsonStr);
                jsonMatcher.region(startLoc, jsonStr.length()-1);
            }
            jsonMatcher.reset(jsonStr);
        }
        
        obj.jsonValueMap = parseSimpleJson(jsonStr);
        
        return obj; 
    }
    
    
    private JSONObject getObjectForToken(String token) {
        try {
            Integer idx = Integer.valueOf(token.substring(1, token.length()-1));
            String subJson = this.subs.get(idx);
        
            if(subJson != null) {
                System.debug('sub:' + subJson);
                return new JSONObject(this.subs, parseSimpleJson(subJson));
            }
        } catch (Exception e) {
            return new JSONObject(token);
        }
        return null;
    }
    
    public JSONObject get(String key) {
        String val = (jsonValueMap != null) ? jsonValueMap.get(key) : null;
        if (val == null) {
            return new JSONObject();
        } else if (val.startsWith('$') && val.endsWith('$')) {
            return getObjectForToken(val);
        } else if (val.startsWith('[') && val.endsWith(']')) {
            val = val.substring(1, val.length()-1);
            return new JSONObject(this.subs, val.split(','));
        }
        
        return new JSONObject('null'.equals(val) ? null : val.replaceFirst('"(.*)"', '$1'));
    }
    
    public String value() {
        if (this.value != null) {
            return this.value.replace('\\n', '\n').replace('\\r', '\r').replace('\\t', '\t');
        } else if (this.jsonValueMap != null) {
            return createSimpleJson(this.jsonValueMap);
        }
        return null;
    }
    
    public JSONObject[] getArray(String key) {
        String val = (jsonValueMap != null) ? jsonValueMap.get(key) : null;
        if (val == null) {
            return null;
        } else if (val.startsWith('[') && val.endsWith(']')) {
            val = val.substring(1, val.length()-1);
            List<JSONObject> objs = new List<JSONObject>();
            for(String item : val.split(',')) {
                if (item.startsWith('$') && item.endsWith('$'))
                   objs.add(getObjectForToken(item));
                else {
                    item = ('null'.equals(item) ? null : item.replaceFirst('"(.*)"', '$1'));
                    objs.add(new JSONObject(item));
                }
            }
            return objs;
        }
        return null;
    }
    
    public static testmethod void testJSONParser() {
        String jsonStr = '{"boolean":true,"string":"text","nullValue":null,"array":[1,2,3],"object":{"prop":"value"}}';
        JSONObject obj = JSONObject.newInstance(jsonStr);
        
        System.assertEquals('true', obj.get('boolean').value());
        System.assertEquals('text', obj.get('string').value());
        System.assertEquals(null, obj.get('nullValue').value());
        System.assertEquals(3, obj.get('array').arrayValues.size());
        System.assertEquals(3, obj.getArray('array').size());
        System.assertEquals('value', obj.get('object').get('prop').value());
    }
}