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

public with sharing class ContactDetailsController extends BaseServiceController {
	
	public List<LayoutSection> sections {get; private set;} 
	private Integer timezoneDiffInMinutes = 0;
	
	private static final Set<String> fieldTypesToSkip = new Set<String> {
	   'base64', 'combobox', 'encryptedstring', 'datacategorygroupreference', 'anyType'
	};
	
	public class LayoutSection {
		public List<LayoutItem> dataRows {get; private set;}
		public Integer columns {get; private set;}
		public String heading {get; private set;}
		
		private LayoutSection(String heading, Integer cols) {
			this.heading = heading;
			this.columns = cols;
			this.dataRows = new List<LayoutItem>();
		}
	}
	
	public class LayoutItem {
		public String label {get; private set;}
		public String dataType {get; private set;}
		private String value;
		public String getValue() { return (value != null ? value : ' '); }
		public boolean isText { get {return dataType != 'phone' && dataType != 'email' && dataType != 'url' && dataType != 'boolean';} } 
	}
	
	public ContactDetailsController() {
        super(System.currentPageReference().getHeaders());
    }
    
    private static List<String> getFieldNamesFromLayout(SFDCPartnerSoap.DescribeLayout layout) {
    	List<String> fields = new List<String>();
    	   
    	for (SFDCPartnerSoap.DescribeLayoutSection section : layout.detailLayoutSections) 
    		if (section != null && section.layoutRows != null)
    		    for (SFDCPartnerSoap.DescribeLayoutRow row : section.layoutRows)
    			    if (row != null && row.layoutItems != null)
    			        for (SFDCPartnerSoap.DescribeLayoutItem item : row.layoutItems)
    				        if (item != null && item.layoutComponents != null)
    				            for (SFDCPartnerSoap.DescribeLayoutComponent comp : item.layoutComponents)
    					            if (comp != null && comp.type_x.equalsIgnoreCase('Field')) fields.add(comp.value);
    	
    	return fields;
    }
    
    private static Map<String, SFDCPartnerSoap.Field> getFieldInfoMap(SFDCPartnerSoap.DescribeSObjectResult describeContact) {
    	
    	Map<String, SFDCPartnerSoap.Field> fieldInfoMap = new Map<String, SFDCPartnerSoap.Field>();
    	for (SFDCPartnerSoap.Field field : describeContact.fields) {
    		fieldInfoMap.put(field.name, field);
    	}
    	return fieldInfoMap;
    }
    
	public void fetchContactDetails() {
		
		if (!this.sm.isValid()) return;
		
        String cid = System.currentPageReference().getParameters().get('id');
        String tzOffset = System.currentPageReference().getParameters().get('tzOffset');
        
        if (tzOffset != null && tzOffset.trim().length() > 0) {
        	try { timezoneDiffInMinutes = Integer.valueOf(tzOffset); } catch(Exception e) {}
        }
        
        SFDCPartnerSoap.DescribeLayout layout;
        
        {   //Scope the variables
	        String rtid = System.currentPageReference().getParameters().get('rtid');
	        
	        List<ID> rtIds = new List<ID>();
	        if(rtid != null && rtid.trim().length() > 0) rtIds.add(rtid);
	        
	        SFDCPartnerSoap.DescribeLayoutResult layoutInfos = client.describeLayout('Contact', rtIds);
	        
	        // If multiple layouts select the master one
	        if (layoutInfos.layouts != null && layoutInfos.layouts.size() > 1) {
	        	Id layoutId;
	            for (SFDCPartnerSoap.RecordTypeMapping mapping : layoutInfos.recordTypeMappings) {
	            	if (mapping.name.equalsIgnoreCase('Master')) {
	            		layoutId = mapping.layoutId;
	            		break;
	            	}
	            }
	            
	            for (SFDCPartnerSoap.DescribeLayout l : layoutInfos.layouts) {
	            	if (l.id == layoutId) {
	            		layout = l;
	            		break;
	            	}
	            }
	        } else if (layoutInfos.layouts != null && layoutInfos.layouts.size() == 1) {
	        	layout = layoutInfos.layouts[0];
	        }
        }
        
        if (layout != null) {
        	
        	// minify layout
        	layout.editLayoutSections = null;
        	layout.buttonLayoutSection = null;
        	layout.relatedLists = null;
        	
        	Map<String, SFDCPartnerSoap.Field> fieldInfos;
        	JSONObject fieldAndValues;
        	
        	{   //Scope the variables
	        	// Grab fields to query
	        	List<String> fields = getFieldNamesFromLayout(layout);
	        	
	        	if (fields != null && fields.size() > 0) {
	        	    
	        	    fieldInfos = getFieldInfoMap(client.describeSObjectSOAP('Contact'));
	        	    
	        	    for (integer idx = fields.size()-1; idx >= 0; idx--) {
	        	    	String field = fields[idx];
	        	    	SFDCPartnerSoap.Field fieldInfo = fieldInfos.get(field);
	        	    	String fieldType = fieldInfo.type_x;
	        	    	if (fieldTypesToSkip.contains(fieldType) || (fieldInfo.htmlFormatted != null && fieldInfo.htmlFormatted)) {
	        	    		fields.remove(idx);
	        	    		fieldInfos.remove(field);
	        	    	} else if ('reference'.equalsIgnoreCase(fieldType)) {
	        	    		String referenceName = fieldInfo.relationshipName;
	        	    		fields.add(referenceName + ( fieldInfo.referenceTo[0].equalsIgnoreCase('Case') ? '.Subject' : '.Name'));
	        	    	} else if (fieldType == null) {
	        	    		fields.remove(idx);
	        	    		fieldInfos.remove(field);
	        	    	}
	        	    }
	        	    String details = client.details('Contact', cid, fields);
	        	    fieldAndValues = JSONObject.newInstance(details);
	        	}
        	}
        	
        	if (fieldAndValues != null) {
        		setupControllerValues(layout, fieldInfos, fieldAndValues);
        	}
        }
    }
    
    private LayoutItem getLayoutItemForDescribe(SFDCPartnerSoap.DescribeLayoutItem item, Map<String, SFDCPartnerSoap.Field> fieldInfos, JSONObject fieldAndValues) {
    	LayoutItem val = new LayoutItem();
        val.label = item.label;
        val.value = '';
        
        if (item != null && item.layoutComponents != null) {
	        for (SFDCPartnerSoap.DescribeLayoutComponent comp : item.layoutComponents) {
	        	if ('Field'.equalsIgnoreCase(comp.type_x)) {
	                SFDCPartnerSoap.Field fieldInfo = fieldInfos.get(comp.value);
	                if (fieldInfo != null) {
	                    // Check if it is a reference and set the name
	                    if ('reference'.equalsIgnoreCase(fieldInfo.type_x)) {
	                    	String relName = fieldInfo.relationshipName;
	                    	String fieldName = ('Case'.equalsIgnoreCase(fieldInfo.referenceTo[0])) ? 'Subject' : 'Name';
	                    	val.value = fieldAndValues.get(relName).get(fieldName).value();
	                    	val.dataType = 'string'; // set type as string
	                    } else {
	                    	// Assign data type if not already assigned
                            val.dataType = (val.dataType != null) ? val.dataType : fieldInfo.type_x;
                            // Assign value
	                    	String fieldValue = fieldAndValues.get(comp.value).value();
	                    	if (fieldInfo.type_x == 'datetime' && fieldValue != null) {
	                    		fieldValue = fieldValue.subString(0, 10) + ' ' + fieldValue.subString(11, 19);
	                    		val.value += DateTime.valueOf(fieldValue).addMinutes(-1*this.timezoneDiffInMinutes)
	                    		             .format('MMM dd, yyyy hh:mm a', 'GMT'); 
	                    	} else if (fieldInfo.type_x == 'date' && fieldValue != null) {
	                    		Date d = Date.valueOf(fieldValue); Time t = Time.newInstance(0,0,0,0);
	                    		val.value += DateTime.newInstance(d, t).format('MMM dd, yyyy', 'GMT');
	                    	} else {
	                    	    val.value += (fieldValue != null) ? fieldValue : '';
	                    	}
	                    }
	                }
	            } else if ('Separator'.equalsIgnoreCase(comp.type_x)) {
	            	if (val.value != null && val.value.length() > 0) val.value += comp.value;
	            	val.dataType = 'string';
	            }
	        }
        }
        if (val.dataType != null && 
            (val.dataType.equalsIgnoreCase('boolean') ||
                (val.value != null && val.value.length() > 0))) 
            return val;
        return null;
    }
    
    private void setupControllerValues(SFDCPartnerSoap.DescribeLayout layout, Map<String, SFDCPartnerSoap.Field> fieldInfos, JSONObject fieldAndValues) {
    	sections = new List<LayoutSection>();
        // Iterate over sections
        for (SFDCPartnerSoap.DescribeLayoutSection section : layout.detailLayoutSections) {
            // Initialize layout section
            LayoutSection sec = new LayoutSection(section.heading, section.columns);
            // Iterate over rows
            for (SFDCPartnerSoap.DescribeLayoutRow row : section.layoutRows) {
                for (SFDCPartnerSoap.DescribeLayoutItem item : row.layoutItems) {
                    LayoutItem val = getLayoutItemForDescribe(item, fieldInfos, fieldAndValues);
                    if (val != null) sec.dataRows.add(val);
                }
            }
            if (sec.dataRows.size() > 0) sections.add(sec);
        }
    }

}