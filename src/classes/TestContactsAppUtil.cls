public with sharing class TestContactsAppUtil {
    
    public static testmethod void testEncryptDecrypt() {
        String key = EncodingUtil.base64Encode(Crypto.generateAesKey(128));
        String text = 'text to encrypt';
        
        String encryptedText = ContactsAppUtil.encrypt(key, text);
        System.assertEquals(text, ContactsAppUtil.decrypt(key, encryptedText), 'Decrypted String didn\'t match.');
    }
    
    public static testmethod void testHash() {
        String text = 'text to hash';
        String hash = ContactsAppUtil.generateHash(text);
        
        Blob expectedHash = Crypto.generateDigest('MD5', Blob.valueOf(text));
        System.assertEquals(EncodingUtil.base64Encode(expectedHash), hash, 'Hashed value didn\'t match.');
    }
    
    public static testmethod void testCSVGeneration() {
        String[] arrayList = new String[] {'a', 'b', 'c', 'd'};
        System.assertEquals('a,b,c,d', ContactsAppUtil.createCSVFromList(arrayList), 'CSV value didn\'t match.');
        System.assertEquals('\'a\',\'b\',\'c\',\'d\'', ContactsAppUtil.createCSVFromList(arrayList, true), 'CSV value didn\'t match.');
    }
}