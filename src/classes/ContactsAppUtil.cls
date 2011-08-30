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

public with sharing class ContactsAppUtil {
	
	public static Map<String, String> parseSimpleJson(String jsonStr) {
        
        Pattern jsonPattern = Pattern.compile('\\s*"([^"]+?)"\\s*:\\s*(".*?"|[a-zA-Z0-9]+?)\\s*[,\\}]');
        Matcher respMatcher = jsonPattern.matcher(jsonStr);
        
        Map<String, String> jsonMap = new Map<String, String>();
        
        while (respMatcher.find()) {
            if (respMatcher.groupCount() == 2) {
            	String val = respMatcher.group(2);
            	jsonMap.put(respMatcher.group(1), ('null'.equals(val) ? null : val.replaceFirst('"(.*)"', '$1')));
            }
        }
        
        return jsonMap;   
    }
    
    public static String createSimpleJson(Map<String, String> keyValueMap) {
        
        String json = '{';
        
        for (String key : keyValueMap.keySet()) {
        	json += '"' + key + '":"' + keyValueMap.get(key) + '",';
        }
        
        json = json.subString(0, json.length()-1) + '}';
        
        return json;   
    }
    
    public static Map<String, Map<String, String>> parseFieldInfosFromDescribe(String describeResult) {
    	
    	Map<String, Map<String, String>> fieldInfoMap = new Map<String, Map<String, String>>();
    	
    	Pattern jsonPattern = Pattern.compile('\\s*"fields"\\s*:\\s*\\[(.+?"sortable":(?:true|false)\\})\\]\\s*,?');
        Matcher respMatcher = jsonPattern.matcher(describeResult);
        
        String fieldOnlyDescribe;
        
        if (respMatcher.find() && respMatcher.groupCount() == 1) {
            fieldOnlyDescribe = respMatcher.group(1);
        }
        
        System.debug(fieldOnlyDescribe);
        
        if (fieldOnlyDescribe != null && fieldOnlyDescribe.length() > 0) {
        	jsonPattern = Pattern.compile('\\s*(\\{"length"\\s*:.+?"sortable":(?:true|false)\\})\\s*,?');
            respMatcher = jsonPattern.matcher(fieldOnlyDescribe);
            
            while (respMatcher.find()) {
                if (respMatcher.groupCount() == 1) {
                	System.debug(respMatcher.group(1));
                	Map<String, String> fieldInfo = parseSimpleJson(respMatcher.group(1));
                	fieldInfoMap.put(fieldInfo.get('name'), fieldInfo);
                }
            }
        }
        
        return fieldInfoMap;
    }
    
    public static Map<String, JSONObject> parseFieldInfoJsonFromDescribe(String describeResult) {
        
        Map<String, JSONObject> fieldInfoMap = new Map<String, JSONObject>();
        
        JSONObject describeObj = JSONObject.newInstance(describeResult);
        
        JSONObject[] fields = describeObj.getArray('fields');
        
        for (JSONObject field : fields) {
        	fieldInfoMap.put(field.get('name').value(), field);
        }
        
        return fieldInfoMap;
    }
    
    public static String encrypt(String key, String value) {
        String encryptedValue = '';
        if (value != null) {
            Blob keyBlob = EncodingUtil.base64Decode(key);
            Blob valueBlob = Blob.valueOf(value);
            encryptedValue = EncodingUtil.base64Encode(Crypto.encryptWithManagedIV('AES128', keyBlob, valueBlob));
        }
        System.debug('Encrypted Token:' + encryptedValue);
        return encryptedValue;
    }
        
    public static String decrypt(String key, String value) {
        String decryptedValue = '';
        if (value != null) {
            Blob keyBlob = EncodingUtil.base64Decode(key);
            Blob valueBlob = EncodingUtil.base64Decode(value);
            decryptedValue = Crypto.decryptWithManagedIV('AES128', keyBlob, valueBlob).toString();
        }
        System.debug('Decrypted Token:' + decryptedValue);
        return decryptedValue;
    }
    
    public static String generateHash(String text) {
    	Blob hash = Crypto.generateDigest('MD5', Blob.valueOf(text));
    	if (hash != null) {
    		return EncodingUtil.base64Encode(hash);
    	}
    	return null;
    }
    
    public static String createCSVFromList(List<Object> objList) {
        return createCSVFromList(objList, false);
    }
    
    public static String createCSVFromList(List<Object> objList, boolean addQuotes) {
        String csv;
        
        if (objList != null && objList.size() > 0) {
        	csv = '';
            for (Object obj : objList) {
            	if (addQuotes) obj = ('\'' + obj + '\'');
            	csv += (obj + ',');
            }
            csv = csv.subString(0, csv.length() - 1);
        }
        
        return csv;
    }

}