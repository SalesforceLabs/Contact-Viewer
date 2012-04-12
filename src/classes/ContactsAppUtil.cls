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