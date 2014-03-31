//
// JQuery Namespace (Cross-Browser Extension)
//
// By Ciccio Ceras
//

/*

usage example:

//sample xml:
<wps:Capabilities xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" service="WPS" version="1.0.0" xml:lang="en-US" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsGetCapabilities_response.xsd" updateSequence="1">
	<ows:ServiceIdentification>
	<ows:Title>i-Marine Web Processing Server</ows:Title>
	<ows:Abstract>
		iMarine (283644) is funded by the European Commission under Framework Programme 7
	</ows:Abstract>
	<wps:ProcessOfferings>
		<wps:Process wps:processVersion="1.0.0">
			<ows:Identifier>
				com.terradue.wps_hadoop.processes.fao.spread.Spread
			</ows:Identifier>
			<ows:Title>Spread</ows:Title>
		</wps:Process>
		<wps:Process wps:processVersion="1.0.0">
			<ows:Identifier>
				com.terradue.wps_hadoop.processes.ird.indicator.IndicatorI6
			</ows:Identifier>
			<ows:Title>IRD Tuna Atlas Indicator i6</ows:Title>
		</wps:Process>
		<wps:Process wps:processVersion="1.0.0">
			<ows:Identifier>
				com.terradue.wps_hadoop.processes.ird.indicator.IndicatorI1
			</ows:Identifier>
			<ows:Title>IRD Tuna Atlas Indicator i1</ows:Title>
		</wps:Process>
	</wps:ProcessOfferings>
</wps:Capabilities>

// 1) usage with namespace URI
var ns={
	wps: "http://www.opengis.net/wps/1.0.0",
	ows:"http://www.opengis.net/ows/1.1"
}
$xml.findNsURI(ns.wps, "Process").findNsURI(ns.ows, "Identifier").each( function(){console.log($(this).text())}  )

// 2) usage with only namespace
$xml.findNs("wps", "Process").findNs("ows", "Identifier").each( function(){console.log($(this).text())}  )

// 3) usage with only namespace, simplified in an unique tagname
$xml.findNs("wps:Process").findNs("ows:Identifier").each( function(){console.log($(this).text())}  )

// all the three statements produce this output:
com.terradue.wps_hadoop.processes.fao.spread.Spread
com.terradue.wps_hadoop.processes.ird.indicator.IndicatorI6
com.terradue.wps_hadoop.processes.ird.indicator.IndicatorI1

 */

;(function($){
	
	$.fn.findNsURI = function(namespaceURI, tagName){
		var $xml = $(this);

		// check if the browser is chrome
		if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1){
			return $xml.find(tagName).filter(function() {
				//console.log("TAG",this);
				//console.log("--tagname", this.tagName, (this.tagName == namespace+":"+tagName));
				// check the tagName (tagName===<ns>:<tag>
				return (this.namespaceURI == namespaceURI);
			});
		} 
		
		// other browsers
		else {
			return $xml.find("*").filter(function(){
				//console.log("TAG",this);
				//console.log("--tagname", this.tagName, (this.tagName == namespace+":"+tagName));
				// check the tagName (tagName===<ns>:<tag>
				return (this.localName==tagName && this.namespaceURI==namespaceURI);
			});
		}

	};
	
	$.fn.findNs = function(namespace, tagName){
		if (tagName==null){
			var ar = namespace.split(":");
			if (ar.length==0) return;
			tagName=ar[1];
			namespace=ar[0];
		}
		
		var $xml = $(this);
		
		// check if the browser is chrome
		if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1){
			return $xml.find(tagName).filter(function() {
				// check the tagName (tagName===<ns>:<tag>
				return (this.tagName == namespace+":"+tagName);
			});
		}
		
		// other browsers: only jquery works good
		else
			return $xml.find(namespace+"\\:"+tagName);
		
	};
	
})(jQuery);

